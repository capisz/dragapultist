import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  csrf: "c".repeat(32),
  verifyResult: null as Record<string, unknown> | null,
  verifyError: null as Error | null,
  users: [] as Array<Record<string, unknown>>,
}))

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => {
    if (name === "dragapultist_csrf") return { value: state.csrf }
    if (name === "dragapultist_session") return { value: "active-session" }
    return undefined
  } }),
}))

const revokeRefreshTokens = vi.hoisted(() => vi.fn(async () => undefined))
const verifySessionCookie = vi.hoisted(() => vi.fn(async () => ({ uid: "uid-alice" })))

vi.mock("@/lib/firebase-admin", () => ({
  firebaseAdminAuth: {
    verifyIdToken: vi.fn(async () => {
      if (state.verifyError) throw state.verifyError
      return state.verifyResult
    }),
    createSessionCookie: vi.fn(async () => "server-session-cookie"),
    verifySessionCookie,
    revokeRefreshTokens,
  },
}))

vi.mock("@/lib/mongodb", () => ({
  default: Promise.resolve({
    db: () => ({
      collection: () => ({
        findOne: async (filter: Record<string, unknown>) => state.users.find((user) =>
          Object.entries(filter).every(([key, value]) => user[key] === value),
        ),
        insertOne: async (document: Record<string, unknown>) => { state.users.push(document); return { insertedId: "new-user" } },
        updateOne: async (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) => {
          const user = state.users.find((candidate) => Object.entries(filter).every(([key, value]) => candidate[key] === value))
          if (user) Object.assign(user, update.$set)
          return { matchedCount: user ? 1 : 0 }
        },
      }),
    }),
  }),
}))

import { DELETE, POST } from "@/app/api/auth/session/route"

function request(overrides: { origin?: string; csrf?: string } = {}) {
  const csrf = overrides.csrf ?? state.csrf
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-CSRF-Token": csrf }
  if (overrides.origin !== "") headers.Origin = overrides.origin ?? "http://localhost:3000"
  return new Request("http://localhost:3000/api/auth/session", {
    method: "POST",
    headers,
    body: JSON.stringify({ idToken: "t".repeat(120), csrfToken: csrf, username: "alice" }),
  })
}

beforeEach(() => {
  state.users = []
  state.verifyError = null
  state.verifyResult = {
    uid: "uid-alice",
    email: "alice@example.test",
    email_verified: true,
    auth_time: Math.floor(Date.now() / 1000),
    name: "alice",
  }
  revokeRefreshTokens.mockClear()
  verifySessionCookie.mockClear()
})

describe("session route", () => {
  it("rejects missing origins and CSRF mismatches", async () => {
    expect((await POST(request({ origin: "" }))).status).toBe(403)
    expect((await POST(request({ csrf: "wrong-token-value-that-is-long" }))).status).toBe(403)
  })

  it("maps forged and revoked Firebase tokens to 401 without leaking details", async () => {
    for (const code of ["auth/argument-error", "auth/id-token-revoked"]) {
      state.verifyError = Object.assign(new Error("sensitive Firebase detail"), { code })
      const response = await POST(request())
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: "Firebase could not verify this sign-in." })
    }
  })

  it("rejects an old sign-in and an unverified email", async () => {
    state.verifyResult = { ...state.verifyResult, auth_time: Math.floor(Date.now() / 1000) - 301 }
    expect((await POST(request())).status).toBe(401)

    state.verifyResult = { ...state.verifyResult, auth_time: Math.floor(Date.now() / 1000), email_verified: false }
    const response = await POST(request())
    expect(response.status).toBe(403)
    expect((await response.json()).code).toBe("EMAIL_VERIFICATION_REQUIRED")
    expect(state.users).toHaveLength(0)
  })

  it("creates a profile and secure session only for a recently verified token", async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(state.users).toHaveLength(1)
    expect(state.users[0]).toMatchObject({ firebaseUid: "uid-alice", username: "alice", verified: true })
    expect(response.headers.get("set-cookie")).toContain("dragapultist_session=")
  })

  it("revokes the verified Firebase session before clearing logout cookies", async () => {
    const logoutRequest = new Request("http://localhost:3000/api/auth/session", {
      method: "DELETE",
      headers: { Origin: "http://localhost:3000", "X-CSRF-Token": state.csrf },
    })
    const response = await DELETE(logoutRequest)
    expect(response.status).toBe(200)
    expect(verifySessionCookie).toHaveBeenCalledWith("active-session", true)
    expect(revokeRefreshTokens).toHaveBeenCalledWith("uid-alice")
    expect(response.headers.get("set-cookie")).toContain("dragapultist_session=")
  })
})
