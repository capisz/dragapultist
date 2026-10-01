"use client"
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { Portal } from '@radix-ui/react-tooltip'
import type { GameSummary } from '@/types/game'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ArchetypeIconPair } from './archetype-icon-pair'
import { matchArchetype, matchOutcome } from '@/utils/match-presentation'
import { GhostScaffold } from './ghost-scaffold'
import { MatchHistoryList } from './match-history-list'
import './game-list.css'

type SortConfig = { key: keyof GameSummary; direction: 'asc' | 'desc' }
const SORT_OPTIONS = [
  { key: 'date', label: 'Date' },
  { key: 'opponent', label: 'Opponent name' },
  { key: 'opponentArchetype', label: 'Opponent deck' },
  { key: 'userWon', label: 'Result' },
  { key: 'turns', label: 'Rounds' },
] as const

interface GameListProps {
  toolbar?: ReactNode
  importComposer?: ReactNode
  loading?: boolean
  freshId?: string | null
  filterRevision?: number
  games: GameSummary[]
  onSelectGame: (game: GameSummary) => void
  onDeleteGame: (id: string) => void
  sortConfig: SortConfig
  onSort: (key: keyof GameSummary) => void
  showTags?: boolean
  isDarkMode?: boolean
  restoreMatchId?: string | null
  hasHistory?: boolean
  searchQuery?: string
  onClearSearch?: () => void
  onImport?: () => void
}

export function GameList({ toolbar, importComposer, loading = false, freshId, filterRevision = 0, games, onSelectGame, sortConfig, onSort, restoreMatchId, hasHistory, searchQuery = '', onClearSearch, onImport }: GameListProps) {
  const [view, setView] = useState<'constellation' | 'list'>('constellation')
  useEffect(() => { try { if (localStorage.getItem('dragapultist-match-view') === 'list') setView('list') } catch {} }, [])
  const [filterSide, setFilterSide] = useState<'user' | 'opponent'>('user')
  const [archetypeFilter, setArchetypeFilter] = useState<{ id: string | null } | null>(null)
  const field = useRef<HTMLDivElement>(null)
  const [briefId, setBriefId] = useState<string | null>(null)
  const [opponentPreviewId, setOpponentPreviewId] = useState<string | null>(null)
  const lastPointer = useRef({ type: '', at: 0 })
  const history = useRef<HTMLElement>(null)
  const [columns, setColumns] = useState(6)
  useEffect(() => {
    const measure = () => {
      const mobile = window.innerWidth < 720
      const width = (history.current?.clientWidth ?? 1280) - 2
      const tile = mobile ? 72 : 104, gap = mobile ? 8 : 14, pad = mobile ? 12 : 20
      setColumns(Math.max(3, Math.min(6, Math.floor((width - 2 * pad + gap) / (tile + gap)))))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (history.current) observer.observe(history.current)
    window.addEventListener('resize', measure)
    return () => { observer.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  useEffect(() => { setArchetypeFilter(null); setBriefId(null) }, [filterRevision])
  useEffect(() => {
    setOpponentPreviewId(null)
    if (!briefId) return
    const timer = window.setTimeout(() => setOpponentPreviewId(briefId), 450)
    return () => window.clearTimeout(timer)
  }, [briefId])
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setBriefId(null) }
    const outside = (event: PointerEvent) => { if (!(event.target as Element).closest('[data-match-tile]')) setBriefId(null) }
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', outside)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', outside) }
  }, [])
  const closeBrief = (id: string) => setBriefId(current => current === id ? null : current)
  const archetypeFilters = Array.from(new Map(games.map(game => {
    const archetype = matchArchetype(game, filterSide === 'opponent')
    return [archetype.id, archetype] as const
  })).values())
  const visibleGames = archetypeFilter
    ? games.filter(game => matchArchetype(game, filterSide === 'opponent').id === archetypeFilter.id)
    : games
  useEffect(() => {
    if (restoreMatchId) field.current?.querySelector<HTMLButtonElement>(`[data-match-id="${CSS.escape(restoreMatchId)}"]`)?.focus({ preventScroll: true })
  }, [restoreMatchId, view])
  const wins = visibleGames.filter(game => matchOutcome(game).code === 'W').length
  const losses = visibleGames.length - wins
  const hasFilter = Boolean(searchQuery.trim() || archetypeFilter)
  function clearFilters() { setArchetypeFilter(null); onClearSearch?.() }
  return <section ref={history} className="match-history" aria-label="Match history" aria-busy={loading} style={{ "--match-columns": columns } as CSSProperties}>
    <div className="games-working-band">{toolbar}<div className="match-metrics" aria-live="polite" aria-atomic="true">
      <div><strong>{loading ? "—" : visibleGames.length}</strong><span>Matches</span></div>
      <div><strong>{!loading && visibleGames.length ? `${Math.round(wins / visibleGames.length * 100)}%` : '—'}</strong><span>Win rate</span></div>
      <div><strong>{loading ? "—" : `${wins}W · ${losses}L`}</strong><span>Results</span></div>
      <div><strong>{!loading && visibleGames.length ? (visibleGames.reduce((sum, game) => sum + game.turns, 0) / visibleGames.length).toFixed(1) : '—'}</strong><span>Avg rounds</span></div>
    </div>
      <ToggleGroup type="single" value={sortConfig.key} className="match-sort" aria-label="Sort matches">
        {SORT_OPTIONS.map(({ key, label }) => <ToggleGroupItem key={key} value={key} onClick={() => onSort(key)}>{label}{sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : ''}</ToggleGroupItem>)}
      </ToggleGroup>
      {importComposer}
    </div>
    {loading || (!hasHistory && !hasFilter) ? <><span className="sr-only" role="status">{loading ? "Loading matches…" : ""}</span><GhostScaffold /></> : games.length > 0 || archetypeFilter ? <div className="constellation-panel">
      <div className="constellation-filter-bar" role="group" aria-label={`Filter matches by ${filterSide === 'opponent' ? "opponent's" : 'your'} archetype`}>
        <ToggleGroup type="single" className="constellation-filter-toggle" aria-label="Choose whose archetypes to filter" value={filterSide} onValueChange={side => {
          if (side !== 'user' && side !== 'opponent') return
          setFilterSide(side)
          setArchetypeFilter(null)
          setBriefId(null)
        }}>
          <ToggleGroupItem value="user">Your decks</ToggleGroupItem>
          <ToggleGroupItem value="opponent">Opponent decks</ToggleGroupItem>
        </ToggleGroup>
        <div className="constellation-filter-options">
          {archetypeFilter && <button type="button" onClick={() => { setArchetypeFilter(null); setBriefId(null) }} aria-label="Show all archetypes">All</button>}
          {archetypeFilters.map(({ id, label }) => <button key={JSON.stringify(id)} type="button" className="constellation-filter" aria-pressed={archetypeFilter?.id === id} onClick={() => { setArchetypeFilter(previous => previous?.id === id ? null : { id }); setBriefId(null) }} title={filterSide === 'opponent' ? `Show matches against ${label}` : `Show your ${label} matches`}>
            <ArchetypeIconPair archetypeId={id} size={26} localSprites /><span className="sr-only">{filterSide === 'opponent' ? `Show matches against ${label}` : `Show your ${label} matches`}</span>
          </button>)}
        </div>
      </div>
      <div className="match-view-bar">
        <ToggleGroup type="single" value={view} aria-label="Match view" onValueChange={value => {
          if (value !== 'constellation' && value !== 'list') return
          setView(value); setBriefId(null)
          try { localStorage.setItem('dragapultist-match-view', value) } catch {}
        }}>
          <ToggleGroupItem value="constellation">Constellation</ToggleGroupItem>
          <ToggleGroupItem value="list">List</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div ref={field}>
      {view === 'list' ? <MatchHistoryList key={`${filterSide}-${archetypeFilter?.id ?? 'all'}-${filterRevision}-${searchQuery}`} games={visibleGames} side={filterSide} freshId={freshId} onSelectGame={onSelectGame} /> :
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <div className="constellation-field" role="group" aria-label="Matches">
          {visibleGames.map(game => {
            const outcome = matchOutcome(game)
            const userArchetype = matchArchetype(game)
            const opponentArchetype = matchArchetype(game, true)
            return <div key={game.id} className="constellation-position">
              <Tooltip open={briefId === game.id}>
                <TooltipTrigger asChild>
                  <button type="button" data-match-id={game.id} data-match-tile data-brief={briefId === game.id} data-opponent-preview={briefId === game.id && opponentPreviewId === game.id} data-fresh={freshId === game.id} className="constellation-point"
                    aria-label={`${outcome.label} against ${game.opponent}, ${userArchetype.label} versus ${opponentArchetype.label}, ${game.date}. Open match review.`}
                    onPointerDown={event => { lastPointer.current = { type: event.pointerType, at: Date.now() } }}
                    onPointerEnter={event => { if (event.pointerType === 'mouse') setBriefId(game.id) }}
                    onPointerLeave={event => { if (event.pointerType === 'mouse') closeBrief(game.id) }}
                    onFocus={() => { if (Date.now() - lastPointer.current.at > 600) setBriefId(game.id) }}
                    onBlur={() => closeBrief(game.id)}
                    onClick={event => {
                      const touch = event.detail !== 0 && ['touch', 'pen'].includes(lastPointer.current.type) && Date.now() - lastPointer.current.at < 600
                      if (touch && briefId !== game.id) { setBriefId(game.id); return }
                      setBriefId(null); onSelectGame(game)
                    }}>
                    <span className="constellation-identity" data-outcome={outcome.code}>
                      <span className="constellation-sprite constellation-sprite--user" aria-hidden="true"><ArchetypeIconPair archetypeId={userArchetype.id} size={50} localSprites /></span>
                      <span className="constellation-sprite constellation-sprite--opponent" aria-hidden="true"><ArchetypeIconPair archetypeId={opponentArchetype.id} size={50} localSprites /></span>
                    </span>
                  </button>
                </TooltipTrigger>
                <Portal><TooltipContent side="bottom" sideOffset={2} collisionPadding={8} collisionBoundary={history.current} className="match-brief">
                  <span className="brief-result-dot" data-outcome={outcome.code} />
                  <strong>{game.opponent}</strong><span>{game.userPrizeCardsTaken} – {game.opponentPrizeCardsTaken} prizes</span><span aria-hidden="true">·</span><span>{game.date}</span>
                </TooltipContent></Portal>
              </Tooltip>
            </div>
          })}
        </div>
      </TooltipProvider>}
      </div>
    </div> : null}
    {!loading && !visibleGames.length && <div className="match-empty" role="status"><div><h3>{hasFilter || hasHistory ? 'No matches found.' : 'Import a game to begin.'}</h3><p>{hasFilter ? (searchQuery.trim() ? `Nothing recorded matches “${searchQuery.trim()}”.` : 'No matches for that archetype.') : 'Each match becomes one point in this field.'}</p></div><Button className="action" onClick={hasFilter || hasHistory ? clearFilters : onImport}>{hasFilter || hasHistory ? 'Clear search' : 'Import a game'}</Button></div>}
  </section>
}
