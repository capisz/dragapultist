import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ cookie: "session-cookie" as string | null, revoked: false }))

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name === "dragapultist_session" && state.cookie ? { value: state.cookie } : undefined,
  }),
}))

const verifySessionCookie = vi.hoisted(() => vi.fn(async (_cookie: string, checkRevoked: boolean) => {
  if (state.revoked) throw Object.assign(new Error("revoked"), { code: "auth/session-cookie-revoked" })
  return { uid: "verified-user", checkRevoked }
}))

vi.mock("@/lib/firebase-admin", () => ({ firebaseAdminAuth: { verifySessionCookie } }))

import { verifiedSession } from "@/lib/session"

beforeEach(() => {
  state.cookie = "session-cookie"
  state.revoked = false
  verifySessionCookie.mockClear()
})

describe("verifiedSession", () => {
  it("requests revocation checking for every session cookie", async () => {
    expect(await verifiedSession()).toMatchObject({ uid: "verified-user" })
    expect(verifySessionCookie).toHaveBeenCalledWith("session-cookie", true)
  })

  it("rejects revoked sessions and missing cookies", async () => {
    state.revoked = true
    expect(await verifiedSession()).toBeNull()
    state.cookie = null
    expect(await verifiedSession()).toBeNull()
  })
})

