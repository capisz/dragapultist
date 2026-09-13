import { ObjectId } from "mongodb"
import { cookies } from "next/headers"
import { verifiedSession } from "@/lib/session"
import { SESSION_COOKIE } from "@/lib/session"

export type RequestIdentity =
  | { status: "authenticated"; userId: string }
  | { status: "missing" | "invalid"; userId: null }

export async function getRequestIdentity(): Promise<RequestIdentity> {
  const jar = await cookies()
  const hasCookie = Boolean(jar.get(SESSION_COOKIE)?.value)
  const session = await verifiedSession()
  if (session?.uid) return { status: "authenticated", userId: session.uid }
  return { status: hasCookie ? "invalid" : "missing", userId: null }
}

export async function getRequestUserId(): Promise<string | null> {
  return (await getRequestIdentity()).userId
}

export function userIdQueryValue(userId: string): string | { $in: Array<string | ObjectId> } {
  if (ObjectId.isValid(userId)) return { $in: [userId, new ObjectId(userId)] }
  return userId
}
