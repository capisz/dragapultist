import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import type { DecodedIdToken } from "firebase-admin/auth"
import { firebaseAdminAuth } from "@/lib/firebase-admin"

export const SESSION_COOKIE = "dragapultist_session"
export const CSRF_COOKIE = "dragapultist_csrf"
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000

export function newCsrfToken() {
  return randomBytes(32).toString("base64url")
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest()
  const rightHash = createHash("sha256").update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

export async function assertCsrf(request: Request, bodyToken?: unknown) {
  const jar = await cookies()
  const cookieToken = jar.get(CSRF_COOKIE)?.value
  const headerToken = request.headers.get("x-csrf-token")
  const suppliedToken = typeof bodyToken === "string" ? bodyToken : headerToken

  if (!cookieToken || !suppliedToken || !safeEqual(cookieToken, suppliedToken)) {
    throw new Error("Invalid CSRF token")
  }
}

export async function assertMutationRequest(request: Request, bodyToken?: unknown) {
  assertTrustedOrigin(request)
  await assertCsrf(request, bodyToken)
}

export function assertTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) throw new Error("Missing request origin")

  const allowed = new Set<string>()
  for (const configured of [process.env.APP_ORIGIN, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!configured) continue
    try {
      allowed.add(new URL(configured).origin)
    } catch {
      throw new Error("Invalid configured application origin")
    }
  }

  if (process.env.NODE_ENV !== "production") {
    allowed.add(new URL(request.url).origin)
  }

  if (!allowed.has(origin)) throw new Error("Untrusted request origin")
}

export async function verifiedSession(): Promise<DecodedIdToken | null> {
  const jar = await cookies()
  const sessionCookie = jar.get(SESSION_COOKIE)?.value
  if (!sessionCookie) return null

  try {
    return await firebaseAdminAuth.verifySessionCookie(sessionCookie, true)
  } catch {
    return null
  }
}
