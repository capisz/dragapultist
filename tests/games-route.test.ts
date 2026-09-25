import { beforeEach, describe, expect, it, vi } from "vitest"

type Doc = Record<string, any>
const state = vi.hoisted(() => ({ uid: "user-a" as string | null, docs: [] as Doc[], cleanupCalls: [] as string[] }))

function scalarMatches(actual: unknown, expected: unknown): boolean {
  if (expected && typeof expected === "object" && "$in" in (expected as Record<string, unknown>)) {
    return (expected as { $in: unknown[] }).$in.includes(actual)
  }
  return actual === expected
}

function matches(document: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return (value as Doc[]).some((candidate) => matches(document, candidate))
    return scalarMatches(document[key], value)
  })
}

vi.mock("@/lib/request-user", () => ({
  getRequestUserId: vi.fn(async () => state.uid),
  getRequestIdentity: vi.fn(async () => state.uid
    ? { status: "authenticated", userId: state.uid }
    : { status: "missing", userId: null }),
  userIdQueryValue: (uid: string) => uid,
}))

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "dragapultist_csrf" ? { value: "test-csrf-token-value-long" } : undefined }),
}))

vi.mock("@/utils/game-analyzer", () => ({
  analyzeGameLog: vi.fn((rawLog: string, _swap: boolean, _a: unknown, _b: unknown, userArchetype: unknown, opponentArchetype: unknown, username: string) => ({
    ...validGame,
    rawLog,
    username,
    userArchetype,
    opponentArchetype,
  })),
}))

vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: (name: string) => ({
        createIndex: async () => "games_owner_import_fingerprint",
        findOne: async (filter: Doc) => state.docs.find((document) => matches(document, filter)) ?? null,
        updateOne: async (filter: Doc, update: Doc, options?: { upsert?: boolean }) => {
          let document = state.docs.find((candidate) => matches(candidate, filter))
          const inserted = !document && options?.upsert
          if (inserted) {
            document = {}
            state.docs.push(document)
          }
          if (!document) return { matchedCount: 0 }
          if (inserted) Object.assign(document, update.$setOnInsert ?? {})
          Object.assign(document, update.$set ?? {})
          for (const [key, amount] of Object.entries(update.$inc ?? {})) document[key] = (document[key] ?? 0) + amount
          for (const key of Object.keys(update.$unset ?? {})) delete document[key]
          return { matchedCount: 1, upsertedCount: inserted ? 1 : 0 }
        },
        deleteOne: async (filter: Doc) => {
          const index = state.docs.findIndex((document) => matches(document, filter))
          if (index < 0) return { deletedCount: 0 }
          state.docs.splice(index, 1)
          return { deletedCount: 1 }
        },
        deleteMany: async () => {
          state.cleanupCalls.push(name)
          return { deletedCount: 0 }
        },
      }),
    }),
  }),
}))

import { POST } from "@/app/api/games/route"
import { DELETE, PATCH, PUT } from "@/app/api/games/[id]/route"

const rawLog = "Setup\nTurn # 1 - alice's Turn\nalice played a card.\nalice wins."
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
  rawLog,
  wentFirst: true,
  userConceded: false,
  opponentConceded: false,
  highDamageAttackCount: 1,
  benchKnockouts: 0,
  totalBenchedPokemon: 4,
  weaknessBonus: false,
  actionPackedTurns: { user: 1, opponent: 1 },
}

function mutation(path: string, method: string, body?: unknown, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin, "X-CSRF-Token": "test-csrf-token-value-long" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const context = (id = "game-1") => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  state.uid = "user-a"
  state.docs = []
  state.cleanupCalls = []
})

describe("game routes", () => {
  it("derives ownership from each verified user and deduplicates only within that owner", async () => {
    expect((await POST(mutation("/api/games", "POST", { gameSummary: { ...validGame, userId: "forged" } }) as any)).status).toBe(201)
    expect(state.docs[0].userId).toBe("user-a")

    const duplicate = await POST(mutation("/api/games", "POST", { gameSummary: validGame }) as any)
    expect((await duplicate.json()).duplicate).toBe(true)
    expect(state.docs).toHaveLength(1)

    state.uid = "user-b"
    const otherUser = await POST(mutation("/api/games", "POST", { gameSummary: validGame }) as any)
    expect((await otherUser.json()).duplicate).toBe(false)
    expect(state.docs.map((doc) => doc.userId).sort()).toEqual(["user-a", "user-b"])
  })

  it("deduplicates concurrent whitespace-equivalent imports without replacing private notes", async () => {
    const requests = [validGame, { ...validGame, id: "other-id", rawLog: validGame.rawLog.replace(/ /g, "  ").replace(/\n/g, "\r\n") }]
    const responses = await Promise.all(requests.map(game => POST(mutation("/api/games", "POST", { gameSummary: game }) as any)))
    expect(responses.map(response => response.status).sort()).toEqual([200, 201])
    expect(state.docs).toHaveLength(1)
    expect(state.docs[0].importFingerprint).toMatch(/^[a-f0-9]{64}$/)
  })

  it("returns 409 for a stale revision and preserves the stored game", async () => {
    state.docs.push({ ...validGame, userId: "user-a", revision: 2 })
    const response = await PUT(
      mutation("/api/games/game-1", "PUT", { gameSummary: { ...validGame, notes: { 1: "new" } }, expectedRevision: 1 }),
      context(),
    )
    expect(response.status).toBe(409)
    expect(state.docs[0].notes).toBeUndefined()
  })

  it("updates bounded metadata and increments the revision", async () => {
    state.docs.push({ ...validGame, userId: "user-a", revision: 1 })
    const response = await PATCH(
      mutation("/api/games/game-1", "PATCH", {
        changes: { notes: { 1: "review" }, favorite: true, deckName: "League deck", deckList: "Pokémon: 20" },
        expectedRevision: 1,
      }),
      context(),
    )
    expect(response.status).toBe(200)
    expect(state.docs[0]).toMatchObject({
      notes: { 1: "review" }, favorite: true, deckName: "League deck", deckList: "Pokémon: 20", revision: 2,
    })
  })

  it("rejects malformed, oversized, cross-origin, and cross-owner writes", async () => {
    expect((await POST(mutation("/api/games", "POST", { gameSummary: { ...validGame, rawLog: "short" } }) as any)).status).toBe(400)
    expect((await POST(mutation("/api/games", "POST", { gameSummary: { ...validGame, rawLog: "x".repeat(262_145) } }) as any)).status).toBe(400)
    expect((await POST(mutation("/api/games", "POST", { gameSummary: validGame }, "https://attacker.example") as any)).status).toBe(403)

    state.docs.push({ ...validGame, userId: "user-a", revision: 1 })
    state.uid = "user-b"
    const crossOwnerDelete = await DELETE(mutation("/api/games/game-1", "DELETE"), context())
    expect(crossOwnerDelete.status).toBe(200)
    expect(await crossOwnerDelete.json()).toEqual({ ok: true, deleted: false })
    expect(state.docs).toHaveLength(1)
  })

  it("does not persist a signed-out or guest request", async () => {
    state.uid = null
    expect((await POST(mutation("/api/games", "POST", { gameSummary: validGame }) as any)).status).toBe(401)
    expect(state.docs).toHaveLength(0)
  })

  it("protects revisioned deletes and cleans dependent owner records after success", async () => {
    state.docs.push({ ...validGame, userId: "user-a", revision: 2 })
    const conflict = await DELETE(mutation("/api/games/game-1", "DELETE", { expectedRevision: 1 }), context())
    expect(conflict.status).toBe(409)
    expect(state.docs).toHaveLength(1)
    expect(state.cleanupCalls).toEqual([])

    const removed = await DELETE(mutation("/api/games/game-1", "DELETE", { expectedRevision: 2 }), context())
    expect(removed.status).toBe(200)
    expect(await removed.json()).toEqual({ ok: true, deleted: true })
    expect(state.docs).toHaveLength(0)
    expect(state.cleanupCalls).toEqual(["imports", "prizeMaps"])
  })
})
