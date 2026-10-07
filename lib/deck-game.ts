import { DeckError, resolveDeckAssignment, type DeckAssignment, type DeckLibrary } from '@/lib/deck-contract'

type DeckGame = { deckId?: string | null; deckName?: string; deckList?: string; username?: string; userArchetype?: string | null }
type Changes = DeckGame & { perspective?: { username: string; userArchetype?: string | null } }
export function importDeckFields(library: DeckLibrary, game: DeckGame & { deckAssignment?: DeckAssignment }) {
  if (game.deckAssignment) return resolveDeckAssignment(library, game.deckAssignment)
  if (game.deckId) return resolveDeckAssignment(library, { mode: 'explicit', deckId: game.deckId })
  return { deckId: null, deckName: game.deckName ?? '', deckList: game.deckList ?? '' }
}
export function mutationDeckFields(library: DeckLibrary, current: DeckGame, changes: Changes) {
  const swapped = changes.perspective && changes.perspective.username !== current.username
  const id = changes.deckId === undefined ? current.deckId : changes.deckId
  if (swapped || (changes.deckId === null && current.deckId)) return { deckId: null, deckName: '', deckList: '' }
  if (!id) return changes.deckId === null ? { deckId: null } : {}
  const deck = library.decks.find(deck => deck.id === id)
  if (!deck || (deck.archivedAt && current.deckId !== id)) throw new DeckError('Choose an available saved list.', 'NOT_FOUND')
  if (changes.perspective && changes.perspective.userArchetype !== undefined && changes.perspective.userArchetype !== deck.archetypeId && current.deckId === id) {
    return { deckId: null, deckName: '', deckList: '' }
  }
  return { deckId: id, deckName: current.deckId === id ? current.deckName || deck.name : deck.name, deckList: deck.deckList, userArchetype: deck.archetypeId }
}
