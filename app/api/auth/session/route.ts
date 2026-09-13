import { NextResponse } from "next/server"
import { z } from "zod"
import clientPromise from "@/lib/mongodb"
import { firebaseAdminAuth } from "@/lib/firebase-admin"
import {
  assertCsrf,
  assertTrustedOrigin,
  CSRF_COOKIE,
  newCsrfToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  verifiedSession,
} from "@/lib/session"
import { APP_DATABASE_NAME } from "@/lib/app-database"

const sessionSchema = z.object({
  idToken: z.string().min(100).max(10_000),
  csrfToken: z.string().min(20).max(200),
  username: z.string().trim().min(2).max(40).regex(/^[\p{L}\p{N}_. -]+$/u).optional(),
})

class LegacyAccountConflict extends Error {}
class EmailVerificationRequired extends Error {}

async function ensureMongoProfile(token: Awaited<ReturnType<typeof firebaseAdminAuth.verifyIdToken>>, username?: string) {
  const client = await clientPromise
  const db = client.db(APP_DATABASE_NAME)
  const users = db.collection("users")

  const existingUid = await users.findOne({ firebaseUid: token.uid })
  if (existingUid) {
    if (token.email_verified === true && existingUid.verified !== true) {
      await users.updateOne({ firebaseUid: token.uid }, { $set: { verified: true, updatedAt: new Date() } })
    }
    return
  }

  const normalizedEmail = token.email?.trim().toLowerCase() || null
  if (normalizedEmail) {
    const legacyEmail = await users.findOne({ email: normalizedEmail })
    if (legacyEmail) {
      throw new LegacyAccountConflict("An existing account needs a verified migration before it can use Firebase sign-in.")
    }
  }

  const profileUsername = username || (typeof token.name === "string" ? token.name.trim() : "")
  if (!profileUsername) throw new Error("Account profile is missing. Please complete sign-up first.")
  const usernameTaken = await users.findOne({ username: profileUsername })
  if (usernameTaken) throw new Error("Username is already in use.")

  const now = new Date()
  await users.insertOne({
    firebaseUid: token.uid,
    email: normalizedEmail,
    username: profileUsername,
    verified: token.email_verified === true,
    avatarImage: null,
    bannerImage: null,
    createdAt: now,
    updatedAt: now,
  })
}

export async function GET() {
  const csrfToken = newCsrfToken()
  const response = NextResponse.json({ csrfToken })
  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 10 * 60,
  })
  return response
}

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request)
    const parsed = sessionSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid session request." }, { status: 400 })
    await assertCsrf(request, parsed.data.csrfToken)

    const decoded = await firebaseAdminAuth.verifyIdToken(parsed.data.idToken, true)
    const signedInAt = Number(decoded.auth_time) * 1000
    if (!Number.isFinite(signedInAt) || signedInAt > Date.now() + 60_000 || Date.now() - signedInAt > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Please sign in again before creating a session." }, { status: 401 })
    }

    if (!decoded.email) {
      return NextResponse.json({ error: "This sign-in provider is not supported." }, { status: 401 })
    }
    if (decoded.email_verified !== true) {
      throw new EmailVerificationRequired("Verify your email before signing in.")
    }
    await ensureMongoProfile(decoded, parsed.data.username)
    const sessionCookie = await firebaseAdminAuth.createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    })
    response.cookies.delete("userId")
    response.cookies.delete("guestMode")
    return response
  } catch (error) {
    if (error instanceof EmailVerificationRequired) {
      return NextResponse.json(
        { error: error.message, code: "EMAIL_VERIFICATION_REQUIRED" },
        { status: 403 },
      )
    }
    if (error instanceof LegacyAccountConflict) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    const message = error instanceof Error ? error.message : ""
    if (message === "Account profile is missing. Please complete sign-up first." || message === "Username is already in use.") {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    if (message === "Invalid CSRF token" || message === "Missing request origin" || message === "Untrusted request origin") {
      return NextResponse.json({ error: "Invalid secure session request." }, { status: 403 })
    }

    const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : ""
    if ((error as { code?: unknown })?.code === 11000) {
      return NextResponse.json({ error: "That account profile is already in use." }, { status: 409 })
    }
    if (code.startsWith("auth/")) {
      return NextResponse.json({ error: "Firebase could not verify this sign-in." }, { status: 401 })
    }

    console.error("POST /api/auth/session error:", error)
    return NextResponse.json({ error: "Could not create a secure session." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    assertTrustedOrigin(request)
    await assertCsrf(request)
    const session = await verifiedSession()
    if (session) await firebaseAdminAuth.revokeRefreshTokens(session.uid)
    const response = NextResponse.json({ ok: true })
    response.cookies.delete(SESSION_COOKIE)
    response.cookies.delete("userId")
    response.cookies.delete("guestMode")
    return response
  } catch {
    return NextResponse.json({ error: "Invalid logout request." }, { status: 403 })
  }
}
