"use client"

import { Pin, X, ArrowRight } from 'lucide-react'
import type { GameSummary } from '@/types/game'
import { ArchetypeIconPair } from './archetype-icon-pair'
import { matchArchetype, matchOutcome } from '@/utils/match-presentation'

export function MatchPreview({ preview, pinned = false, hint = 'Click a match to pin', emptyHint = 'Hover or focus a match to preview it. Click to pin its details.', onClose, onSelectGame }: {
  preview?: GameSummary
  pinned?: boolean
  hint?: string
  emptyHint?: string
  onClose: () => void
  onSelectGame: (game: GameSummary) => void
}) {
  return (
    <aside className="match-list-preview" aria-label="Match preview" data-visible={Boolean(preview)}>
      {preview ? <div className="match-preview-content">
        <div className="match-preview-heading"><h3>Match preview</h3><button type="button" onClick={onClose} aria-label="Close match preview"><X size={16} /></button></div>
        <p className="match-preview-hint">{pinned ? <><Pin size={12} aria-hidden="true" />Pinned</> : hint}</p>
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
      </div> : <div className="match-preview-empty"><h3>Match preview</h3><p>{emptyHint}</p></div>}
    </aside>
  )
}
