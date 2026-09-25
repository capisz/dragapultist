import { describe, expect, it } from 'vitest'
import { matchesSearch } from '../utils/match-presentation'
import type { ReviewGame } from '../utils/match-presentation'

const game = {
  opponent: 'River', username: 'PracticePlayer', date: '2026-09-16',
  userMainAttacker: 'Dragapult ex', opponentMainAttacker: 'Gardevoir ex',
  userOtherPokemon: [], opponentOtherPokemon: [], userWon: true,
  wentFirst: false, tags: [{ text: 'Tournament', color: '#ffffff' }],
  notes: { 1: 'Save the gust effect' }, rawLog: '',
} as unknown as ReviewGame

describe('match history search', () => {
  it('finds turn order alongside opponent, Pokémon, result, tag, date and notes', () => {
    for (const query of [' second ', 'RIVER', 'dragapult', 'win', 'tournament', '2026-09', 'gust']) {
      expect(matchesSearch(game, query), query).toBe(true)
    }
    expect(matchesSearch(game, 'first')).toBe(false)
    expect(matchesSearch({ ...game, wentFirst: true }, 'first')).toBe(true)
    expect(matchesSearch(game, 'no match')).toBe(false)
  })
})
