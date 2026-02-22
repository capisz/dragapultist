"use server"

import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import type { User } from "@/types/auth"

type AuthResponse = {
  success: boolean
  message: string
  user?: User
}

function toUser(doc: any): User {
  return {
    id: String(doc._id),
    email: doc.email ?? null,
    username: doc.username ?? null,
    verified: !!doc.verified,
    avatarImage: typeof doc.avatarImage === "string" ? doc.avatarImage : null,
    bannerImage: typeof doc.bannerImage === "string" ? doc.bannerImage : null,
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  }
}

export async function signUp(formData: FormData): Promise<AuthResponse> {
  try {
    const username = String(formData.get("username") || "").trim()
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const password = String(formData.get("password") || "")

    if (!username || !email || !password) {
      return { success: false, message: "Missing username, email, or password." }
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const users = db.collection("users")

    const existing = await users.findOne({ $or: [{ email }, { username }] })
    if (existing) {
      return { success: false, message: "Email or username already in use." }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const now = new Date()

    const insertRes = await users.insertOne({
      username,
      email,
      passwordHash,
      verified: true,
      avatarImage: null,
      bannerImage: null,
      createdAt: now,
      updatedAt: now,
    })

    const user: User = {
      id: String(insertRes.insertedId),
      email,
      username,
      verified: true,
      avatarImage: null,
      bannerImage: null,
    }

    const jar = await cookies()
    jar.set("userId", user.id, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 7 })

    return { success: true, message: "Account created.", user }
  } catch (err) {
    console.error("signUp error:", err)
    return { success: false, message: "Sign up failed." }
  }
}

export async function login(formData: FormData): Promise<AuthResponse> {
  try {
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const password = String(formData.get("password") || "")

    if (!email || !password) {
      return { success: false, message: "Missing email or password." }
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const users = db.collection("users")

    const doc = await users.findOne({ email })
    if (!doc?.passwordHash) return { success: false, message: "Invalid email or password." }

    const ok = await bcrypt.compare(password, doc.passwordHash)
    if (!ok) return { success: false, message: "Invalid email or password." }

    const user = toUser(doc)

    const jar = await cookies()
    jar.set("userId", user.id, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 7 })

    return { success: true, message: "Logged in.", user }
  } catch (err) {
    console.error("login error:", err)
    return { success: false, message: "Login failed." }
  }
}

export async function loginAsGuest(): Promise<User> {
  const guestUser: User = {
    id: "guest",
    email: "guest@example.com",
    username: "Guest",
    verified: false,
    avatarImage: null,
    bannerImage: null,
  }

  const jar = await cookies()
  jar.set("userId", guestUser.id, { ...cookieOptions(), maxAge: 60 * 60 * 24 })

  return guestUser
}

export async function logout(): Promise<void> {
  const jar = await cookies()
  jar.delete("userId")
}

export async function getUser(): Promise<User | null> {
  const jar = await cookies()
  const userId = jar.get("userId")?.value
  if (!userId) return null

  if (userId === "guest") {
    return {
      id: "guest",
      email: "guest@example.com",
      username: "Guest",
      verified: false,
      avatarImage: null,
      bannerImage: null,
    }
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const users = db.collection("users")

    const doc = await users.findOne({ _id: new ObjectId(userId) })
    return doc ? toUser(doc) : null
  } catch {
    // invalid ObjectId, etc.
    return null
  }
}
