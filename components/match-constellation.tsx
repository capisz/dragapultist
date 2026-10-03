"use client"

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { GameSummary } from '@/types/game'
import { ArchetypeIconPair } from './archetype-icon-pair'
import { MatchPreview } from './match-preview'
import { matchArchetype, matchOutcome } from '@/utils/match-presentation'

const PAGE_SIZE = 15

export function MatchConstellation({ games, freshId, restoreMatchId, onRestoreComplete, onSelectGame }: {
  games: GameSummary[]
  freshId?: string | null
  restoreMatchId?: string | null
  onRestoreComplete?: () => void
  onSelectGame: (game: GameSummary) => void
}) {
  const [requestedPage, setPage] = useState(() => Math.max(0, Math.floor(games.findIndex(game => game.id === restoreMatchId) / PAGE_SIZE)))
  const pageCount = Math.max(1, Math.ceil(games.length / PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount - 1)
  const pageGames = games.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [opponentPreviewId, setOpponentPreviewId] = useState<string | null>(null)
  const preview = pageGames.find(game => game.id === previewId)
  const activeId = preview?.id
  const matchButtons = useRef(new Map<string, HTMLButtonElement>())
  const lastPointer = useRef({ type: '', at: 0 })
  const suppressFocusPreview = useRef(false)
  const restoredId = useRef<string | null>(null)

  useEffect(() => { setPage(current => Math.min(current, pageCount - 1)) }, [pageCount])
  useEffect(() => {
    if (!restoreMatchId || restoredId.current === restoreMatchId) return
    const index = games.findIndex(game => game.id === restoreMatchId)
    if (index < 0) return
    const targetPage = Math.floor(index / PAGE_SIZE)
    if (targetPage !== page) { setPage(targetPage); return }
    matchButtons.current.get(restoreMatchId)?.focus({ preventScroll: true })
    restoredId.current = restoreMatchId
    onRestoreComplete?.()
  }, [restoreMatchId, games, page, onRestoreComplete])
  useEffect(() => {
    setOpponentPreviewId(null)
    if (!activeId) return
    const timer = window.setTimeout(() => setOpponentPreviewId(activeId), 450)
    return () => window.clearTimeout(timer)
  }, [activeId])

  function clearPreview() {
    setPreviewId(null)
    const button = preview ? matchButtons.current.get(preview.id) : undefined
    if (button && document.activeElement !== button) {
      suppressFocusPreview.current = true
      button.focus({ preventScroll: true })
      suppressFocusPreview.current = false
    }
  }
  function changePage(nextPage: number) {
    setPage(nextPage)
    setPreviewId(null)
  }
  // Keep a bounded set of page tabs even for a long match history.
  const firstTab = Math.max(0, Math.min(page - 1, pageCount - 3))
  const pageTabs = Array.from({ length: Math.min(3, pageCount) }, (_, index) => firstTab + index)

  return <div className="match-list-layout constellation-layout" onPointerLeave={event => { if (event.pointerType === 'mouse') setPreviewId(null) }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPreviewId(null)
  }} onKeyDown={event => { if (event.key === 'Escape') { clearPreview(); event.stopPropagation() } }}>
    <div className="constellation-pages">
      <div className="constellation-field" role="group" aria-label={`Matches, page ${page + 1} of ${pageCount}`}>
        {pageGames.map(game => {
          const outcome = matchOutcome(game)
          return <div key={game.id} className="constellation-position">
            <button type="button" data-match-id={game.id} data-match-tile data-brief={preview?.id === game.id} data-opponent-preview={preview?.id === game.id && opponentPreviewId === game.id} data-fresh={freshId === game.id} className="constellation-point"
              ref={node => { if (node) matchButtons.current.set(game.id, node); else matchButtons.current.delete(game.id) }}
              aria-label={`${outcome.label} against ${game.opponent}, ${matchArchetype(game).label} versus ${matchArchetype(game, true).label}, ${game.date}. Open match review.`}
              onPointerDown={event => { lastPointer.current = { type: event.pointerType, at: Date.now() } }}
              onPointerEnter={event => { if (event.pointerType === 'mouse') setPreviewId(game.id) }}
              onFocus={() => { if (!suppressFocusPreview.current && Date.now() - lastPointer.current.at > 600) setPreviewId(game.id) }}
              onClick={event => {
                const touch = event.detail !== 0 && ['touch', 'pen'].includes(lastPointer.current.type) && Date.now() - lastPointer.current.at < 600
                if (touch && preview?.id !== game.id) { setPreviewId(game.id); return }
                setPreviewId(null)
                onSelectGame(game)
              }}>
              <span className="constellation-identity" data-outcome={outcome.code}>
                <span className="constellation-sprite constellation-sprite--user" aria-hidden="true"><ArchetypeIconPair archetypeId={matchArchetype(game).id} size={50} localSprites /></span>
                <span className="constellation-sprite constellation-sprite--opponent" aria-hidden="true"><ArchetypeIconPair archetypeId={matchArchetype(game, true).id} size={50} localSprites /></span>
              </span>
            </button>
          </div>
        })}
      </div>
      <nav className="constellation-pagination" aria-label="Match pages">
        <p role="status" aria-live="polite" aria-atomic="true">Page {page + 1} of {pageCount}<span> · {games.length ? page * PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * PAGE_SIZE, games.length)} of {games.length} matches</span></p>
        <div className="constellation-page-controls">
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => changePage(page - 1)}><ChevronLeft size={14} aria-hidden="true" /><span>Previous</span></button>
          {pageTabs.map(index => <button key={index} type="button" className="constellation-page-number" aria-label={`Page ${index + 1}`} aria-current={page === index ? 'page' : undefined} onClick={() => changePage(index)}>{index + 1}</button>)}
          <button type="button" aria-label="Next page" disabled={page === pageCount - 1} onClick={() => changePage(page + 1)}><span>Next</span><ChevronRight size={14} aria-hidden="true" /></button>
        </div>
      </nav>
    </div>
    <MatchPreview preview={preview} hint="Click a match to open review" emptyHint="Hover or focus a match to preview it. Select a match to open its review." onClose={clearPreview} onSelectGame={onSelectGame} />
  </div>
}
