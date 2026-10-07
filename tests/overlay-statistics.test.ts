import { describe, expect, it } from 'vitest'
import { buildStatistics } from '@/components/statistics/statistics-utils'

describe('overlay game dates', () => {
  it('preserves recorded dates separately from save timestamps without changing existing statistics', () => {
    const model = buildStatistics([
      { id: 'historic', date: '1/2/2020', createdAt: new Date('2026-10-07T16:00:00Z'), userWon: true, userArchetype: 'dragapult', opponent: 'A' },
      { id: 'today', date: '10/7/2026', createdAt: new Date('2026-10-07T15:00:00Z'), userWon: false, userArchetype: 'dragapult', opponent: 'B' },
    ])
    expect(model.games.map(g => g.id)).toEqual(['historic', 'today'])
    expect(model.games.map(g => g.recordedDate)).toEqual(['1/2/2020', '10/7/2026'])
    expect(model.overall).toMatchObject({ totalGames: 2, wins: 1, losses: 1, winRate: 50 })
  })
})
