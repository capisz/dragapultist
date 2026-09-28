import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  csrf: "c".repeat(43),
  sessionCookie: "active-session" as string | null,
  verifyResult: null as Record<string, unknown> | null,
  verifyError: null as Error | null,
  users: [] as Array<Record<string, unknown>>,
}))

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => {
    if (name === "dragapultist_csrf") return { value: state.csrf }
    if (name === "dragapultist_session" && state.sessionCookie) return { value: state.sessionCookie }
    return undefined
  } }),
}))

const revokeRefreshTokens = vi.hoisted(() => vi.fn(async () => undefined))
const verifySessionCookie = vi.hoisted(() => vi.fn(async () => ({ uid: "uid-alice", exp: 2_000_000_000 })))

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

import { DELETE, POST, GET } from "@/app/api/auth/session/route"

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
  state.csrf = "c".repeat(43)
  state.sessionCookie = "active-session"
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
  verifySessionCookie.mockReset()
  verifySessionCookie.mockResolvedValue({ uid: "uid-alice", exp: 2_000_000_000 })
})

describe("session route", () => {
  it("adds verified desktop identity without removing CSRF and disables caching", async () => {
    const response = await GET()
    const body = await response.json()
    expect(body.csrfToken).toBeTypeOf("string")
    expect(body.user).toEqual({ uid: "uid-alice", expiresAt: 2_000_000_000_000 })
    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  it("keeps background status polls from replacing an in-flight request's CSRF token", async () => {
    const initial = await (await GET()).json()
    const background = await (await GET()).json()
    expect(initial.csrfToken).toBe(state.csrf)
    expect(background.csrfToken).toBe(initial.csrfToken)
    expect((await POST(request({ csrf: initial.csrfToken }))).status).toBe(200)
  })

  it("returns explicit signed-out identity while still providing a CSRF token", async () => {
    state.sessionCookie = null
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ csrfToken: state.csrf, user: null })
    expect(verifySessionCookie).not.toHaveBeenCalled()
  })

  it("does not expose desktop identity for a revoked or expired session", async () => {
    verifySessionCookie.mockRejectedValueOnce(new Error("expired session"))
    const response = await GET()
    expect((await response.json()).user).toBeNull()
    expect(verifySessionCookie).toHaveBeenCalledWith("active-session", true)
  })

  it("replaces missing or malformed CSRF cookies with a fresh token", async () => {
    for (const invalidToken of ["", "invalid-cookie"]) {
      state.csrf = invalidToken
      const response = await GET()
      const body = await response.json()
      expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(body.csrfToken).not.toBe(invalidToken)
      expect(response.headers.get("set-cookie")).toContain(`dragapultist_csrf=${body.csrfToken}`)
    }
  })

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
