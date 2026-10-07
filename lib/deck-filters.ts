import type { SavedDeck } from '@/lib/deck-contract'
export const ALL_LISTS = '__all__'
export const UNCATEGORIZED = '__uncategorized__'
export function matchesDeckList(game: { deckId?: string | null }, selection: string) {
  return selection === ALL_LISTS || (selection === UNCATEGORIZED ? !game.deckId : game.deckId === selection)
}
export function deckListOptions(decks: SavedDeck[], games: Array<{ deckId?: string | null; deckName?: string }>, archetypeId: string | null) {
  const options = new Map(decks.filter(deck => deck.archetypeId === archetypeId).map(deck => [deck.id, { id: deck.id, name: deck.name + (deck.archivedAt ? ' (archived)' : '') }]))
  for (const game of games) if (game.deckId && !options.has(game.deckId)) options.set(game.deckId, { id: game.deckId, name: game.deckName || 'Saved list' })
  return [...options.values()]
}
