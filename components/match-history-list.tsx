"use client"

import { useRef, useState } from 'react'
import { Pin, X, ArrowRight } from 'lucide-react'
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
    <aside className="match-list-preview" aria-label="Match preview" data-visible={Boolean(preview)}>
      {preview ? <div className="match-preview-content">
        <div className="match-preview-heading"><h3>Match preview</h3><button type="button" onClick={clearPreview} aria-label="Close match preview"><X size={16} /></button></div>
        <p className="match-preview-hint">{pinnedId === preview.id ? <><Pin size={12} aria-hidden="true" />Pinned</> : 'Click a match to pin'}</p>
        <div className="match-preview-title"><h4>{preview.opponent}</h4><span className="match-result-badge" data-outcome={matchOutcome(preview).code}>{matchOutcome(preview).label}</span></div>
        <p className="match-preview-date">{preview.date}</p>
        <div className="match-preview-versus">
          <div><ArchetypeIconPair archetypeId={matchArchetype(preview).id} size={48} localSprites /><strong>{matchArchetype(preview).label}</strong><small>You</small></div>
          <span>vs</span>
          <div><ArchetypeIconPair archetypeId={matchArchetype(preview, true).id} size={48} localSprites /><strong>{matchArchetype(preview, true).label}</strong><small>Opponent</small></div>
        </div>
        <dl className="match-preview-facts"><div><dt>Rounds played</dt><dd>{preview.turns}</dd></div><div><dt>Prizes taken</dt><dd>{preview.userPrizeCardsTaken} – {preview.opponentPrizeCardsTaken}</dd></div></dl>
        {Boolean(preview.tags?.length) && <div className="match-preview-tags" aria-label="Match tags">{preview.tags!.map((tag, index) => <span key={`${tag.text}-${index}`}>{tag.text}</span>)}</div>}
        <button type="button" className="action match-preview-open" onClick={() => onSelectGame(preview)}>Open match review<ArrowRight size={15} aria-hidden="true" /></button>
      </div> : <div className="match-preview-empty"><h3>Match preview</h3><p>Hover or focus a match to preview it. Click to pin its details.</p></div>}
    </aside>
  </div>
}
