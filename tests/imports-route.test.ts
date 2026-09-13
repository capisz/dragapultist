import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ uid: "user-a" as string | null, docs: [] as Array<Record<string, any>> }))

vi.mock("@/lib/request-user", () => ({
  getRequestUserId: vi.fn(async () => state.uid),
  userIdQueryValue: (uid: string) => uid,
}))

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "dragapultist_csrf" ? { value: "test-csrf-token-value-long" } : undefined }),
}))

vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: () => ({
        findOne: async (filter: Record<string, unknown>) => state.docs.find((doc) =>
          Object.entries(filter).every(([key, value]) => doc[key] === value),
        ) ?? null,
        insertOne: async (doc: Record<string, unknown>) => {
          const stored = { ...doc, _id: `import-${state.docs.length + 1}` }
          state.docs.push(stored)
          return { insertedId: { toString: () => stored._id } }
        },
      }),
    }),
  }),
}))

import { POST } from "@/app/api/imports/route"

function request(body: unknown) {
  return new Request("http://localhost:3000/api/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "X-CSRF-Token": "test-csrf-token-value-long" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  state.uid = "user-a"
  state.docs = []
})

describe("imports route", () => {
  it("makes retries idempotent per owner", async () => {
    const payload = { rawText: "a complete synthetic game log" }
    expect((await POST(request(payload))).status).toBe(201)
    expect((await (await POST(request(payload))).json()).duplicate).toBe(true)
    expect(state.docs).toHaveLength(1)

    state.uid = "user-b"
    expect((await POST(request(payload))).status).toBe(201)
    expect(state.docs).toHaveLength(2)
  })

  it("rejects guest persistence and malformed parsed data", async () => {
    state.uid = null
    expect((await POST(request({ rawText: "a complete synthetic game log" }))).status).toBe(401)
    state.uid = "user-a"
    expect((await POST(request({ rawText: "a complete synthetic game log", parsed: { value: "x".repeat(262_145) } }))).status).toBe(400)
    expect(state.docs).toHaveLength(0)
  })
})
