import { describe, expect, it } from "vitest"
import { buildStatistics } from "@/components/statistics/statistics-utils"

describe("statistics contract", () => {
  it("preserves totals, first-turn results, damage, prizes, and deck grouping from stored summaries", () => {
    const games = [
      {
        id: "one", date: "9/10/2026", username: "alice", opponent: "bob", userWon: true,
        wentFirst: true, turns: 4, damageDealt: 500, userPrizeCardsTaken: 6, opponentPrizeCardsTaken: 2,
        userMainAttacker: "Dragapult ex", opponentMainAttacker: "Charizard ex",
        userOtherPokemon: ["Dreepy"], opponentOtherPokemon: ["Charmander"],
        userArchetype: "dragapult", opponentArchetype: "charizard",
      },
      {
        id: "two", date: "9/11/2026", username: "alice", opponent: "carol", userWon: false,
        wentFirst: false, turns: 6, damageDealt: 300, userPrizeCardsTaken: 3, opponentPrizeCardsTaken: 6,
        userMainAttacker: "Dragapult ex", opponentMainAttacker: "Gardevoir ex",
        userOtherPokemon: ["Dreepy"], opponentOtherPokemon: ["Kirlia"],
        userArchetype: "dragapult", opponentArchetype: "gardevoir",
      },
    ]

    const model = buildStatistics(games)
    expect(model.overall).toMatchObject({
      totalGames: 2,
      wins: 1,
      losses: 1,
      winRate: 50,
      firstTurnGames: 1,
      firstTurnWins: 1,
      avgTurns: 5,
      avgDamageDealt: 400,
      avgUserPrizes: 4.5,
      avgOpponentPrizes: 4,
    })
    expect(model.decks[0]).toMatchObject({ games: 2, wins: 1, losses: 1 })
  })
})

