"use client"
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { GameSummary } from '@/types/game'
import { Button } from '@/components/ui/button'
import { MatchSprite } from './match-sprite'
import { matchOutcome, matchupName, type ReviewGame } from '@/utils/match-presentation'
import './game-list.css'

type SortConfig = { key: keyof GameSummary; direction: 'asc' | 'desc' }
interface GameListProps {
  toolbar?: ReactNode
  games: GameSummary[]
  onSelectGame: (game: GameSummary) => void
  onDeleteGame: (id: string) => void
  sortConfig: SortConfig
  onSort: (key: keyof GameSummary) => void
  showTags?: boolean
  isDarkMode?: boolean
  restoreMatchId?: string | null
  hasHistory?: boolean
}

export function GameList({ toolbar, games, onSelectGame, onDeleteGame, sortConfig, onSort, restoreMatchId, hasHistory }: GameListProps) {
  const [activeId, setActiveId] = useState<string | null>(restoreMatchId ?? null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const field = useRef<HTMLDivElement>(null)
  const active = games.find(game => game.id === activeId)
  const [neighborOffsets, setNeighborOffsets] = useState<Record<string, { x: number; y: number }>>({})
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => {
    if (restoreMatchId) field.current?.querySelector<HTMLButtonElement>(`[data-match-id="${CSS.escape(restoreMatchId)}"]`)?.focus({ preventScroll: true })
  }, [restoreMatchId])
  function selectPoint(id: string) {
    setActiveId(id)
    setPendingDeleteId(null)
    const points = Array.from(field.current?.querySelectorAll<HTMLElement>('.constellation-position') ?? [])
    const selected = points.find(point => point.querySelector('[data-match-id]')?.getAttribute('data-match-id') === id)
    if (!selected) return
    const origin = { x: selected.offsetLeft + selected.offsetWidth / 2, y: selected.offsetTop + selected.offsetHeight / 2 }
    const distances = points.filter(point => point !== selected).map(point => {
      const x = point.offsetLeft + point.offsetWidth / 2 - origin.x
      const y = point.offsetTop + point.offsetHeight / 2 - origin.y
      return { id: point.querySelector('[data-match-id]')!.getAttribute('data-match-id')!, x, y, distance: Math.hypot(x, y) }
    }).sort((a, b) => a.distance - b.distance)
    const nearest = distances[0]?.distance ?? 0
    setNeighborOffsets(Object.fromEntries(distances.filter(point => point.distance <= nearest * 1.25).slice(0, 4).map(point => [point.id, { x: point.x / point.distance * 5, y: point.y / point.distance * 5 }])))
  }
  function remove(id: string) {
    if (pendingDeleteId === id) { onDeleteGame(id); setPendingDeleteId(null); setActiveId(null); return }
    setPendingDeleteId(id)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPendingDeleteId(null), 3000)
  }
  const wins = games.filter(game => matchOutcome(game).code === 'W').length
  const losses = games.filter(game => matchOutcome(game).code === 'L').length
  return <section className="match-history" aria-label="Match history">
    <div className="games-working-band">{toolbar}<div className="match-metrics" aria-live="polite" aria-atomic="true">
      <div><strong>{games.length}</strong><span>Visible matches</span></div>
      <div><strong>{games.length ? `${Math.round(wins / games.length * 100)}%` : '—'}</strong><span>Win rate</span></div>
      <div><strong>{wins} W · {losses} L{games.length - wins - losses > 0 ? ` · ${games.length - wins - losses} T` : ''}</strong><span>Results</span></div>
      <div><strong>{games.length ? (games.reduce((sum, game) => sum + game.turns, 0) / games.length).toFixed(1) : '—'}</strong><span>Average rounds</span></div>
    </div>
        <div className="constellation-heading"><span className="sr-only">Focus or tap a match to see its brief.</span>
          <div className="match-sort" aria-label="Sort matches">{(['date', 'opponent', 'userWon', 'turns'] as const).map(key => <button key={key} type="button" onClick={() => onSort(key)} aria-pressed={sortConfig.key === key}>{key === 'userWon' ? 'Result' : key === 'turns' ? 'Rounds' : key[0].toUpperCase() + key.slice(1)}{sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>)}</div>
        </div>
    </div>
    <div className="constellation-layout">
      <div className="constellation-panel">

        {games.length ? <div ref={field} className="constellation-field" role="group" aria-label="Matches" onKeyDown={event => { if (event.key === 'Escape') { setActiveId(null); setNeighborOffsets({}); setPendingDeleteId(null) } }}>
          {games.map((game, index) => {
            const outcome = matchOutcome(game)
            return <div key={game.id} className="constellation-position" style={{transform: active && neighborOffsets[game.id] ? `translate(${neighborOffsets[game.id].x}px, ${neighborOffsets[game.id].y}px)` : undefined}}>
              <button type="button" data-match-id={game.id} className="constellation-point" data-active={activeId === game.id}
                aria-label={`${outcome.label} against ${game.opponent}, ${matchupName(game)} versus ${matchupName(game, true)}, ${game.date}. Open match review.`}
                onPointerEnter={event => { if (event.pointerType === 'mouse') selectPoint(game.id) }}
                onFocus={() => selectPoint(game.id)}
                onClick={event => { if (event.detail === 0 || !window.matchMedia('(pointer: coarse)').matches) onSelectGame(game); else { selectPoint(game.id); requestAnimationFrame(() => document.querySelector('.match-brief')?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })) } }}>
                <span className="constellation-identity"><MatchSprite name={game.userMainAttacker} /><span className="outcome-dot" data-outcome={outcome.code}>{outcome.code}</span></span>
              </button>
              <span className="constellation-date">{game.date}</span>
            </div>
          })}
        </div> : <div className="match-empty"><h3>{hasHistory ? 'No matching games' : 'Import a game to begin.'}</h3><p>{hasHistory ? 'Try a different opponent, Pokémon, result, date, tag, or note.' : ''}</p></div>}
      </div>
      <aside className="match-brief-space" aria-label="Match brief" hidden={!active}>
        {active ? <div key={active.id} className="match-brief">
          <div className="brief-eyebrow"><span className="outcome-label" data-outcome={matchOutcome(active).code}>{matchOutcome(active).label}</span><span>{active.date}</span></div>
          <h3>{active.opponent}</h3><p className="brief-matchup">{matchupName(active)} <span>vs</span> {matchupName(active, true)}</p>
          <dl><div><dt>Turn order</dt><dd>{active.wentFirst ? 'Went first' : 'Went second'}</dd></div><div><dt>Rounds</dt><dd>{active.turns}</dd></div><div><dt>Prizes taken</dt><dd>{active.userPrizeCardsTaken} – {active.opponentPrizeCardsTaken}</dd></div><div><dt>Private notes</dt><dd>{active.noteCount ?? Object.values((active as ReviewGame).notes ?? {}).filter(note => note.trim()).length}</dd></div></dl>
          <div className="brief-tags">{active.tags?.map(tag => <span key={tag.text}>{tag.text}</span>)}</div>
          <Button onClick={() => onSelectGame(active)} className="brief-open">Open match review →</Button>
          <Button variant="ghost" onClick={() => remove(active.id)}>{pendingDeleteId === active.id ? 'Confirm delete' : 'Delete match'}</Button>
          <span className="sr-only" role="status">{pendingDeleteId === active.id ? 'Activate Confirm delete within three seconds to delete this match.' : ''}</span>
        </div> : null}
      </aside>
    </div>
  </section>
}
