import { beforeEach, describe, expect, it, vi } from "vitest"
import { guestGamePersistence } from "@/lib/game-persistence"
import { keepGamesUntilImportAcknowledged, mergeAcknowledgedGame } from "@/lib/game-list-state"

const rawLog = "Setup\nTurn # 1 - alice's Turn\nalice played a card.\nalice wins."
const game = {
  id: "attempted-id",
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
  rawLog,
  wentFirst: true,
  userConceded: false,
  opponentConceded: false,
  highDamageAttackCount: 1,
  benchKnockouts: 0,
  totalBenchedPokemon: 4,
  weaknessBonus: false,
  actionPackedTurns: { user: 1, opponent: 1 },
  notes: { 1: "keep this" },
  deckList: "Pokémon: 20",
  deckName: "League deck",
}

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
  })
})

describe("guest game persistence", () => {
  it("deduplicates whitespace-equivalent imports after reading persisted storage", async () => {
    const first = await guestGamePersistence.create(game, "first-import-key")
    const repeated = await guestGamePersistence.create({ ...game, id: "different-id", rawLog: rawLog.replace(/ /g, "  ").replace(/\n/g, "\r\n\n") }, "second-import-key")
    expect(repeated.duplicate).toBe(true)
    expect(repeated.game.id).toBe(first.game.id)
    expect((await guestGamePersistence.list()).games).toHaveLength(1)
    expect(repeated.game.notes).toEqual(game.notes)
  })

  it("applies a perspective update without losing private review data", async () => {
    const created = await guestGamePersistence.create(game, "0123456789abcdef")
    const updated = await guestGamePersistence.update(game.id, {
      perspective: { username: "alice", userArchetype: "dragapult", opponentArchetype: "charizard" },
    }, created.revision)

    expect(updated.game).toMatchObject({
      id: game.id,
      revision: 2,
      userArchetype: "dragapult",
      opponentArchetype: "charizard",
      notes: game.notes,
      deckList: game.deckList,
      deckName: game.deckName,
    })
  })

  it("keeps the visible collection unchanged until save succeeds and deduplicates the canonical ID", () => {
    const existing = [{ id: "existing" }, { id: "server-id" }]
    expect(keepGamesUntilImportAcknowledged(existing)).toBe(existing)
    expect(mergeAcknowledgedGame(existing, "attempted-id", { id: "server-id" })).toEqual([
      { id: "existing" },
      { id: "server-id" },
    ])
  })
})
