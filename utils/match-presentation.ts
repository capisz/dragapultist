import type { GameSummary } from '@/types/game'
import { formatArchetypeLabel } from './archetype-mapping'

// Presentation of annotations already written by the existing review callbacks.
export type ReviewGame = GameSummary & { notes?: Record<number, string>; deckList?: string; deckName?: string }

export function matchOutcome(game: GameSummary) {
  return game.userWon ? { code: 'W', label: 'Win' } : { code: 'L', label: 'Loss' }
}
export function matchupName(game: GameSummary, opponent = false) {
  const archetype = opponent ? game.opponentArchetype : game.userArchetype
  return archetype ? formatArchetypeLabel(archetype) : (opponent ? game.opponentMainAttacker : game.userMainAttacker) || 'Unknown Pokémon'
}
export function matchesSearch(game: ReviewGame, query: string) {
  const text = [game.opponent, game.username, game.date, matchupName(game), matchupName(game, true),
    game.userMainAttacker, game.opponentMainAttacker, ...game.userOtherPokemon, ...game.opponentOtherPokemon,
    matchOutcome(game).label, matchOutcome(game).code, ...(game.tags?.map(tag => tag.text) ?? []),
    ...Object.values(game.notes ?? {}), game.rawLog].join(' ').toLocaleLowerCase()
  return text.includes(query.trim().toLocaleLowerCase())
}
