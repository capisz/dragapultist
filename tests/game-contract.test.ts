import { describe, expect, it } from "vitest"
import { gameInputSchema } from "@/lib/game-contract"

const validGame = {
  id: "game-1",
  date: "9/12/2026",
  username: "alice",
  opponent: "bob",
  userMainAttacker: "Dragapult ex",
  opponentMainAttacker: "Charizard ex",
  userOtherPokemon: [],
  opponentOtherPokemon: [],
  turns: 4,
  userWon: true,
  damageDealt: 600,
  userPrizeCardsTaken: 6,
  opponentPrizeCardsTaken: 3,
  rawLog: "Setup\nTurn # 1 - alice's Turn\nalice played a card.\nalice wins.",
  wentFirst: true,
  userConceded: false,
  opponentConceded: false,
  highDamageAttackCount: 1,
  benchKnockouts: 0,
  totalBenchedPokemon: 4,
  weaknessBonus: false,
  actionPackedTurns: { user: 1, opponent: 1 },
}

describe("gameInputSchema", () => {
  it("accepts a bounded game and strips unapproved fields", () => {
    const result = gameInputSchema.parse({ ...validGame, userId: "forged-owner", isAdmin: true })
    expect(result).not.toHaveProperty("userId")
    expect(result).not.toHaveProperty("isAdmin")
  })

  it("rejects logs larger than 256 KiB", () => {
    const result = gameInputSchema.safeParse({ ...validGame, rawLog: "x".repeat(262_145) })
    expect(result.success).toBe(false)
  })

  it("rejects excessive annotations", () => {
    const notes = Object.fromEntries(Array.from({ length: 201 }, (_, index) => [index, "note"]))
    expect(gameInputSchema.safeParse({ ...validGame, notes }).success).toBe(false)
  })

  it("rejects unsafe annotation keys and non-hex tag colors", () => {
    expect(gameInputSchema.safeParse({ ...validGame, notes: { "$where": "bad" } }).success).toBe(false)
    expect(gameInputSchema.safeParse({ ...validGame, tags: [{ text: "Review", color: "url(javascript:bad)" }] }).success).toBe(false)
  })
})
