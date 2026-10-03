"use client"
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { GameSummary } from '@/types/game'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ArchetypeIconPair } from './archetype-icon-pair'
import { matchArchetype, matchOutcome } from '@/utils/match-presentation'
import { GhostScaffold } from './ghost-scaffold'
import { MatchHistoryList } from './match-history-list'
import { MatchConstellation } from './match-constellation'
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
  const pendingRestoreId = useRef(restoreMatchId)
  useEffect(() => { setArchetypeFilter(null) }, [filterRevision])
  const archetypeFilters = Array.from(new Map(games.map(game => {
    const archetype = matchArchetype(game, filterSide === 'opponent')
    return [archetype.id, archetype] as const
  })).values())
  const visibleGames = archetypeFilter
    ? games.filter(game => matchArchetype(game, filterSide === 'opponent').id === archetypeFilter.id)
    : games
  useEffect(() => {
    if (view === 'list' && restoreMatchId) field.current?.querySelector<HTMLButtonElement>(`[data-match-id="${CSS.escape(restoreMatchId)}"]`)?.focus({ preventScroll: true })
  }, [restoreMatchId, view])
  const wins = visibleGames.filter(game => matchOutcome(game).code === 'W').length
  const losses = visibleGames.length - wins
  const hasFilter = Boolean(searchQuery.trim() || archetypeFilter)
  function clearFilters() { setArchetypeFilter(null); onClearSearch?.() }
  return <section className="match-history" aria-label="Match history" aria-busy={loading}>
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
      <div className="constellation-filter-bar">
        <div className="constellation-filter-scroll" role="group" aria-label={`Filter matches by ${filterSide === 'opponent' ? "opponent's" : 'your'} archetype`} tabIndex={0}>
          <ToggleGroup type="single" className="constellation-filter-toggle" aria-label="Choose whose archetypes to filter" value={filterSide} onValueChange={side => {
            if (side !== 'user' && side !== 'opponent') return
            setFilterSide(side)
            setArchetypeFilter(null)
          }}>
            <ToggleGroupItem value="user">Your decks</ToggleGroupItem>
            <ToggleGroupItem value="opponent">Opponent decks</ToggleGroupItem>
          </ToggleGroup>
          <div className="constellation-filter-options">
            {archetypeFilter && <button type="button" onClick={() => { setArchetypeFilter(null) }} aria-label="Show all archetypes">All</button>}
            {archetypeFilters.map(({ id, label }) => <button key={JSON.stringify(id)} type="button" className="constellation-filter" aria-pressed={archetypeFilter?.id === id} onClick={() => { setArchetypeFilter(previous => previous?.id === id ? null : { id }) }} title={filterSide === 'opponent' ? `Show matches against ${label}` : `Show your ${label} matches`}>
              <ArchetypeIconPair archetypeId={id} size={26} localSprites /><span className="sr-only">{filterSide === 'opponent' ? `Show matches against ${label}` : `Show your ${label} matches`}</span>
            </button>)}
          </div>
        </div>
        <ToggleGroup type="single" className="match-view-toggle" value={view} aria-label="Match view" onValueChange={value => {
          if (value !== 'constellation' && value !== 'list') return
          setView(value)
          try { localStorage.setItem('dragapultist-match-view', value) } catch {}
        }}>
          <ToggleGroupItem value="constellation">Constellation</ToggleGroupItem>
          <ToggleGroupItem value="list">List</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div ref={field}>
      {view === 'list' ? <MatchHistoryList key={`${filterSide}-${archetypeFilter?.id ?? 'all'}-${filterRevision}-${searchQuery}`} games={visibleGames} side={filterSide} freshId={freshId} onSelectGame={onSelectGame} /> :
      <MatchConstellation key={`${filterSide}-${archetypeFilter?.id ?? 'all'}-${filterRevision}-${searchQuery}-${sortConfig.key}-${sortConfig.direction}`} games={visibleGames} freshId={freshId} restoreMatchId={pendingRestoreId.current} onRestoreComplete={() => { pendingRestoreId.current = null }} onSelectGame={onSelectGame} />}
      </div>
    </div> : null}
    {!loading && !visibleGames.length && <div className="match-empty" role="status"><div><h3>{hasFilter || hasHistory ? 'No matches found.' : 'Import a game to begin.'}</h3><p>{hasFilter ? (searchQuery.trim() ? `Nothing recorded matches “${searchQuery.trim()}”.` : 'No matches for that archetype.') : 'Each match becomes one point in this field.'}</p></div><Button className="action" onClick={hasFilter || hasHistory ? clearFilters : onImport}>{hasFilter || hasHistory ? 'Clear search' : 'Import a game'}</Button></div>}
  </section>
}
