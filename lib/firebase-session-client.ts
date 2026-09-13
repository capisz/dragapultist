"use client"

import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth"
import { getFirebaseClientAuth } from "@/lib/firebase-client"

async function csrfToken(): Promise<string> {
  const response = await fetch("/api/auth/session", { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok || typeof payload?.csrfToken !== "string") throw new Error("Could not start a secure session.")
  return payload.csrfToken
}

type SessionResult = { verificationRequired: boolean }

async function createServerSession(idToken: string, username?: string): Promise<SessionResult> {
  const token = await csrfToken()
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify({ idToken, csrfToken: token, username }),
  })
  const payload = await response.json().catch(() => null)
  if (response.status === 403 && payload?.code === "EMAIL_VERIFICATION_REQUIRED") {
    return { verificationRequired: true }
  }
  if (!response.ok) throw new Error(payload?.error || "Could not create a secure session.")
  return { verificationRequired: false }
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event("dragapultist-auth-changed"))
}

export async function firebaseLogin(email: string, password: string) {
  const auth = getFirebaseClientAuth()
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
  try {
    const result = await createServerSession(await credential.user.getIdToken(true))
    if (result.verificationRequired) throw new Error("Verify your email before signing in.")
  } finally {
    await signOut(auth).catch(() => undefined)
  }
  notifyAuthChanged()
}

export async function firebaseSignUp(username: string, email: string, password: string) {
  const auth = getFirebaseClientAuth()
  const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
  try {
    await updateProfile(credential.user, { displayName: username.trim() })
    await sendEmailVerification(credential.user)
    const result = await createServerSession(await credential.user.getIdToken(true), username.trim())
    if (result.verificationRequired) return { verificationRequired: true }
  } catch (error) {
    if (!(error instanceof Error && error.message === "Verify your email before signing in.")) {
      await deleteUser(credential.user).catch(() => undefined)
    }
    throw error
  } finally {
    await signOut(auth).catch(() => undefined)
  }
  notifyAuthChanged()
  return { verificationRequired: false }
}

export async function firebaseLogout() {
  const auth = getFirebaseClientAuth()
  const token = await csrfToken()
  const response = await fetch("/api/auth/session", {
    method: "DELETE",
    headers: { "X-CSRF-Token": token },
  })
  if (!response.ok) throw new Error("Could not end the session.")
  await signOut(auth).catch(() => undefined)
  notifyAuthChanged()
}
