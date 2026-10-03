"use client"

import { useRef, useState } from 'react'
import { MatchPreview } from './match-preview'
import type { GameSummary } from '@/types/game'
import { ArchetypeIconPair } from './archetype-icon-pair'
import { matchArchetype, matchOutcome } from '@/utils/match-presentation'

export function MatchHistoryList({ games, side, freshId, onSelectGame }: {
  games: GameSummary[]
  side: 'user' | 'opponent'
  freshId?: string | null
  onSelectGame: (game: GameSummary) => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const matchButtons = useRef(new Map<string, HTMLButtonElement>())
  const suppressFocusPreview = useRef(false)
  const preview = games.find(game => game.id === (hoverId ?? pinnedId))
  const groups = new Map<string | null, { id: string | null; label: string; matches: GameSummary[] }>()
  for (const game of games) {
    const archetype = matchArchetype(game, side === 'opponent')
    const group = groups.get(archetype.id) ?? { ...archetype, matches: [] }
    group.matches.push(game)
    groups.set(archetype.id, group)
  }
  function clearPreview() {
    setHoverId(null)
    setPinnedId(null)
    const button = preview ? matchButtons.current.get(preview.id) : undefined
    if (button && document.activeElement !== button) {
      // Restoring focus must not immediately reopen the preview it just closed.
      suppressFocusPreview.current = true
      button.focus({ preventScroll: true })
      suppressFocusPreview.current = false
    }
  }

  return <div className="match-list-layout" onPointerLeave={event => { if (event.pointerType === 'mouse') setHoverId(null) }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHoverId(null)
  }} onKeyDown={event => { if (event.key === 'Escape') { clearPreview(); event.stopPropagation() } }}>
    <div className="match-list-groups" aria-label="List matches">
      <div className="match-list-legend"><span><i data-outcome="W" />Win</span><span><i data-outcome="L" />Loss</span></div>
      {Array.from(groups.values()).map(group => {
        const wins = group.matches.filter(game => game.userWon).length
        return <section key={JSON.stringify(group.id)} className="match-list-group" aria-label={`${group.label} match history`}>
          <div className="match-list-deck">
            <ArchetypeIconPair archetypeId={group.id} size={48} localSprites />
            <h3>{group.label}</h3>
            <p>{group.matches.length} {group.matches.length === 1 ? 'match' : 'matches'}</p>
            <p><span className="match-win-text">{wins}W</span> · <span className="match-loss-text">{group.matches.length - wins}L</span></p>
          </div>
          <div className="match-list-record">
            <div className="match-list-record-label"><span>Match history</span><span>{Math.round(wins / group.matches.length * 100)}% win rate</span></div>
            <div className="match-dot-grid" role="group" aria-label={`${group.label} match dots`}>
              {group.matches.map(game => <button key={game.id} type="button" className="match-dot" data-match-id={game.id} data-outcome={matchOutcome(game).code} data-active={preview?.id === game.id} data-fresh={freshId === game.id}
                ref={node => { if (node) matchButtons.current.set(game.id, node); else matchButtons.current.delete(game.id) }}
                aria-label={`${matchOutcome(game).label} against ${game.opponent}, ${matchArchetype(game, true).label}, ${game.turns} rounds, ${game.date}. Preview match.`}
                aria-pressed={pinnedId === game.id}
                onPointerEnter={event => { if (event.pointerType === 'mouse') setHoverId(game.id) }}
                onFocus={() => { if (!suppressFocusPreview.current) setHoverId(game.id) }}
                onClick={() => { setPinnedId(game.id); setHoverId(null) }} />)}
              {Array.from({ length: Math.max(60, Math.ceil(group.matches.length / 20) * 20) - group.matches.length }, (_, index) => <span key={index} className="match-dot-empty" aria-hidden="true" />)}
            </div>
          </div>
        </section>
      })}
      <p className="match-list-caption">Each colored square is one match. Empty squares are unused slots.</p>
    </div>
    <MatchPreview preview={preview} pinned={pinnedId === preview?.id} onClose={clearPreview} onSelectGame={onSelectGame} />
  </div>
}
