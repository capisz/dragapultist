'use client'
import { DeckListSelect } from './deck-list-select'
import { Plus, Library } from 'lucide-react'
import { ArchetypeIconPair } from './archetype-icon-pair'
import { useState } from 'react'
import { useDeckLibrary } from './deck-library'
import { ALL_LISTS, UNCATEGORIZED, deckListOptions } from '@/lib/deck-filters'
import { ownerGamePersistence } from '@/lib/game-persistence'
import { assignDeckToGames } from '@/lib/deck-bulk'
import type { GameSummary } from '@/types/game'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'

export function DeckListPicker({ games, archetypeId, value, onChange, label = 'Decklist', ariaLabel = label }: { games: Array<{ deckId?: string | null; deckName?: string }>; archetypeId: string | null; value: string; onChange: (id: string) => void; label?: string; ariaLabel?: string }) {
  const library = useDeckLibrary()
  const options = deckListOptions(library.decks, games, archetypeId)
  return <label className="deck-list-picker">{label}<DeckListSelect label={ariaLabel} value={value} onValueChange={onChange} options={[{ value: ALL_LISTS, label: 'All lists' }, ...options.map(deck => ({ value: deck.id, label: deck.name, archetypeId })), { value: UNCATEGORIZED, label: 'Uncategorized' }]} /></label>
}
export function MatchDeckAssignment({ game, onSave }: { game: GameSummary; onSave: (game: GameSummary) => Promise<boolean> }) {
  const library = useDeckLibrary()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function choose(id: string) {
    setBusy(true); setError('')
    try {
      const deck = library.decks.find(deck => deck.id === id)
      const saved = await onSave({ ...game, deckId: deck?.id ?? null, deckName: deck?.name ?? '', deckList: deck?.deckList ?? '', userArchetype: deck?.archetypeId ?? game.userArchetype })
      if (!saved) setError('Could not assign this list. Your selection was not saved; retry after refreshing the match.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not assign this list.') }
    finally { setBusy(false) }
  }
  return <div className="deck-assignment deck-dialog-body"><label className="deck-field">Played decklist<DeckListSelect label="Played decklist" value={game.deckId ?? ''} disabled={busy || library.loading} onValueChange={id => void choose(id)} options={[{ value: '', label: 'Uncategorized' }, ...library.decks.filter(deck => !deck.archivedAt || deck.id === game.deckId).map(deck => ({ value: deck.id, label: deck.name + (deck.archivedAt ? ' (archived)' : ''), archetypeId: deck.archetypeId }))]} /></label>
    <div className="deck-assignment-actions"><Button variant="outline" disabled={busy} onClick={() => library.openManager({ archetypeId: game.userArchetype })}><Plus aria-hidden />Create decklist</Button>
    {game.deckList && <Button variant="outline" onClick={() => library.openManager({ name: game.deckName, deckList: game.deckList, archetypeId: game.userArchetype })}><Library aria-hidden />Save to library</Button>}</div>
    {game.deckList && <details className="deck-recorded-list"><summary>Recorded decklist{game.deckName ? ` · ${game.deckName}` : ''}</summary><pre>{game.deckList}</pre></details>}
    {busy && <p className="deck-feedback" role="status">Saving assignment…</p>}
    {error && <p className="deck-feedback" role="alert">{error}</p>}
  </div>
}
export function BulkDeckAssignment({ games, archetypeId, onClose }: { games: GameSummary[]; archetypeId: string | null; onClose: () => void }) {
  const library = useDeckLibrary()
  const [selected, setSelected] = useState(new Set<string>())
  const [deckId, setDeckId] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState('')
  const owner = library.owner
  async function save() {
    setBusy(true)
    const result = await assignDeckToGames(ownerGamePersistence(owner ?? 'guest'), games.filter(game => selected.has(game.id)), deckId || null, undefined, () => library.isOwnerCurrent(owner))
    setSelected(new Set([...result.conflicted, ...result.failed]))
    setReport(`${result.saved.length} saved · ${result.conflicted.length} conflicted · ${result.failed.length} failed.${result.conflicted.length ? ' Refresh the history before retrying conflicts.' : ''}`)
    window.dispatchEvent(new Event('dragapultist-games-changed')); library.refresh(); setBusy(false)
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent className="deck-library-dialog"><DialogHeader className="deck-dialog-header"><div className="deck-dialog-heading"><span className="deck-dialog-identity"><ArchetypeIconPair archetypeId={archetypeId} size={30} localSprites /></span><div><DialogTitle>Assign decklist</DialogTitle><DialogDescription>Choose games from this archetype to update.</DialogDescription></div></div></DialogHeader>
    <div className="deck-dialog-body"><label className="deck-field">Decklist<DeckListSelect label="Decklist" value={deckId} onValueChange={setDeckId} disabled={busy} options={[{ value: '', label: 'Uncategorized' }, ...library.decks.filter(deck => !deck.archivedAt && deck.archetypeId === archetypeId).map(deck => ({ value: deck.id, label: deck.name, archetypeId: deck.archetypeId }))]} /></label>
    <label className="deck-checkbox deck-select-all"><input type="checkbox" checked={!!games.length && selected.size === games.length} disabled={busy} onChange={event => setSelected(event.target.checked ? new Set(games.map(game => game.id)) : new Set())} />Select all matching games ({games.length})</label>
    <div className="deck-assignment-options">{games.map(game => <label key={game.id} data-selected={selected.has(game.id)}><input type="checkbox" checked={selected.has(game.id)} disabled={busy} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(game.id); else next.delete(game.id); return next })} /><span className="deck-assignment-game"><strong>{game.opponent}</strong><small>{game.date}</small></span><span className="deck-game-result" data-win={game.userWon}>{game.userWon ? 'Win' : 'Loss'}</span></label>)}</div>
    {report && <p className="deck-feedback" role="status">{report}</p>}</div>
    <div className="deck-dialog-footer deck-bulk-footer"><span>{selected.size} of {games.length} selected</span><Button className="action" disabled={busy || !selected.size || library.loading} onClick={() => void save()}>{busy ? 'Assigning…' : `Assign ${selected.size} games`}</Button></div>
  </DialogContent></Dialog>
}
