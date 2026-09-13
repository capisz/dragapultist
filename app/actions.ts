"use server"

import { cookies } from "next/headers"
import clientPromise from "@/lib/mongodb"
import { verifiedSession } from "@/lib/session"
import { APP_DATABASE_NAME } from "@/lib/app-database"
import type { User } from "@/types/auth"

const GUEST_USER: User = {
  id: "guest",
  email: "guest@example.com",
  username: "Guest",
  verified: false,
  avatarImage: null,
  bannerImage: null,
}

function toUser(doc: Record<string, unknown>, uid: string, verified: boolean): User {
  return {
    id: uid,
    email: typeof doc.email === "string" ? doc.email : "",
    username: typeof doc.username === "string" ? doc.username : "Account",
    verified,
    avatarImage: typeof doc.avatarImage === "string" ? doc.avatarImage : null,
    bannerImage: typeof doc.bannerImage === "string" ? doc.bannerImage : null,
  }
}

export async function loginAsGuest(): Promise<User> {
  const jar = await cookies()
  jar.set("guestMode", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60,
  })
  jar.delete("userId")
  return GUEST_USER
}

export async function getUser(): Promise<User | null> {
  const session = await verifiedSession()
  if (!session) {
    const jar = await cookies()
    return jar.get("guestMode")?.value === "1" ? GUEST_USER : null
  }

  try {
    const client = await clientPromise
    const db = client.db(APP_DATABASE_NAME)
    const doc = await db.collection("users").findOne({ firebaseUid: session.uid })
    return doc ? toUser(doc as Record<string, unknown>, session.uid, session.email_verified === true) : null
  } catch {
    return null
  }
}
