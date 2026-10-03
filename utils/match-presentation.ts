import type { GameSummary } from '@/types/game'
import { canonicalizeArchetypeId, formatArchetypeLabel } from './archetype-mapping'

// Presentation of annotations already written by the existing review callbacks.
export type ReviewGame = GameSummary & { notes?: Record<number, string>; deckList?: string; deckName?: string }

export function sortMatchesByDate(games: GameSummary[], direction: 'asc' | 'desc', oldestFirst = false) {
  // Legacy guest records have no timestamps but retain their import insertion order.
  const ordered = oldestFirst && direction === 'desc' ? [...games].reverse() : [...games]
  const timestamp = (value?: string) => value ? Date.parse(value) || 0 : 0
  return ordered.sort((a, b) => {
    const compared = timestamp(a.date) - timestamp(b.date) || timestamp(a.createdAt) - timestamp(b.createdAt)
    return direction === 'asc' ? compared : -compared
  })
}

export function matchOutcome(game: GameSummary) {
  return game.userWon ? { code: 'W', label: 'Win' } : { code: 'L', label: 'Loss' }
}
export function matchArchetype(game: GameSummary, opponent = false) {
  const saved = (opponent ? game.opponentArchetype : game.userArchetype)?.trim() || null
  const id = canonicalizeArchetypeId(saved) ?? saved
  // An attacker is not an assigned archetype. Keep missing assignments explicit.
  return { id, label: id ? formatArchetypeLabel(id) : 'Unknown archetype' }
}
export function matchupName(game: GameSummary, opponent = false) {
  const archetype = opponent ? game.opponentArchetype : game.userArchetype
  return archetype ? formatArchetypeLabel(archetype) : (opponent ? game.opponentMainAttacker : game.userMainAttacker) || 'Unknown Pokémon'
}
export function matchesSearch(game: ReviewGame, query: string) {
  const text = [game.opponent, game.username, game.date, matchupName(game), matchupName(game, true),
    game.userMainAttacker, game.opponentMainAttacker, ...game.userOtherPokemon, ...game.opponentOtherPokemon,
    game.wentFirst ? "first" : "second", matchOutcome(game).label, matchOutcome(game).code, ...(game.tags?.map(tag => tag.text) ?? []),
    ...Object.values(game.notes ?? {}), game.rawLog].join(' ').toLocaleLowerCase()
  return text.includes(query.trim().toLocaleLowerCase())
}
