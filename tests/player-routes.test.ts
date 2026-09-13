import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  uid: "user-a" as string | null,
  pipeline: [] as Array<Record<string, unknown>>,
  mode: "search" as "search" | "deck",
}))

vi.mock("@/lib/request-user", () => ({
  getRequestUserId: vi.fn(async () => state.uid),
  userIdQueryValue: (uid: string) => uid,
}))

vi.mock("@/lib/rate-limit", () => ({ allowRequest: () => true }))

vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: () => ({
        aggregate: (pipeline: Array<Record<string, unknown>>) => {
          state.pipeline = pipeline
          const result = state.mode === "search"
            ? [{
                players: [{ _id: "bob", totalGames: 2, wins: 1, lastPlayed: "9/12/2026", decksUsed: ["Charizard ex"], PRIVATE_SENTINEL: "never-return" }],
                deckStats: [{ _id: "bob", deckStats: [{ archetypeId: "charizard", games: 2, wins: 1, PRIVATE_SENTINEL: "never-return" }] }],
              }]
            : [{
                overall: [{ games: 2, wins: 1, PRIVATE_SENTINEL: "never-return" }],
                matchups: [{ _id: "dragapult", games: 2, wins: 1, PRIVATE_SENTINEL: "never-return" }],
              }]
          return { toArray: async () => result }
        },
      }),
    }),
  }),
}))

import { GET as searchPlayers } from "@/app/api/player-search/route"
import { GET as loadDeckBreakdown } from "@/app/api/player-deck-breakdown/route"

beforeEach(() => {
  state.uid = "user-a"
  state.pipeline = []
  state.mode = "search"
})

describe("private player routes", () => {
  it("rejects signed-out searches and scopes recorded participants to the verified owner", async () => {
    state.uid = null
    expect((await searchPlayers(new Request("http://localhost/api/player-search?query=bob") as never)).status).toBe(401)

    state.uid = "user-a"
    const response = await searchPlayers(new Request("http://localhost/api/player-search?query=b.*") as never)
    expect(response.status).toBe(200)
    expect(state.pipeline[0]).toEqual({ $match: { userId: "user-a" } })
    const participantMatch = state.pipeline[3].$match as Record<string, { $regex: RegExp }>
    expect(participantMatch["participants.username"].$regex.source).toBe("b\\.\\*")
    const text = JSON.stringify(await response.json())
    expect(text).not.toContain("PRIVATE_SENTINEL")
    expect(JSON.parse(text)).toMatchObject({ players: [{ username: "bob", totalGames: 2, wins: 1, losses: 1 }] })
  })

  it("returns only the strict owner-derived deck breakdown contract", async () => {
    state.mode = "deck"
    const response = await loadDeckBreakdown(new Request("http://localhost/api/player-deck-breakdown?username=bob&archetypeId=charizard") as never)
    expect(response.status).toBe(200)
    expect(state.pipeline[0]).toEqual({ $match: { userId: "user-a" } })
    const text = JSON.stringify(await response.json())
    expect(text).not.toContain("PRIVATE_SENTINEL")
    expect(JSON.parse(text)).toEqual({
      breakdown: {
        archetypeId: "charizard",
        games: 2,
        wins: 1,
        losses: 1,
        winRate: 50,
        matchups: [{ opponentArchetypeId: "dragapult", games: 2, wins: 1, winRate: 50 }],
      },
    })
  })
})
