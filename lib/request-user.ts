import { ObjectId } from "mongodb"
import { cookies } from "next/headers"
import { auth } from "@/auth"

type UnknownSession = {
  user?: {
    id?: unknown
  } | null
} | null

function readSessionUserId(session: UnknownSession): string | null {
  const id = session?.user?.id
  return typeof id === "string" && id.trim() ? id : null
}

export async function getRequestUserId(): Promise<string | null> {
  // Primary auth source for this app: cookie written by app/actions.ts
  const jar = await cookies()
  const cookieUserId = jar.get("userId")?.value
  if (cookieUserId && cookieUserId !== "guest") return cookieUserId

  // Fallback for any existing next-auth sessions.
  const session = (await auth()) as UnknownSession
  return readSessionUserId(session)
}

export async function getRequestUserObjectId(): Promise<ObjectId | null> {
  const userId = await getRequestUserId()
  if (!userId || !ObjectId.isValid(userId)) return null
  return new ObjectId(userId)
}

export function userIdQueryValue(userId: string): string | { $in: Array<string | ObjectId> } {
  if (ObjectId.isValid(userId)) {
    return { $in: [userId, new ObjectId(userId)] }
  }
  return userId
}
