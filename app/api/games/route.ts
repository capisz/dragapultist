import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { auth } from "@/auth"

type AnyGame = {
  id: string
  userId?: string | null
  [key: string]: any
}

function getSessionUserId(session: any): string | null {
  return session?.user?.id ? String(session.user.id) : null
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userId = getSessionUserId(session)

    // Guest: return empty list (avoid UI error states)
    if (!userId) {
      return NextResponse.json({ games: [] }, { status: 200 })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const collection = db.collection<AnyGame>("games")

    const { searchParams } = new URL(req.url)
    const usernameParam = searchParams.get("username")
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 1000) : 500

    const query: any = { userId }
    if (usernameParam && usernameParam.trim() !== "") {
      const regex = new RegExp(usernameParam, "i")
      query.$or = [{ username: regex }, { opponent: regex }]
    }

    const games = await collection.find(query).sort({ createdAt: -1 }).limit(limit).toArray()
    return NextResponse.json({ games })
  } catch (err) {
    console.error("GET /api/games error:", err)
    return NextResponse.json({ error: "Failed to load games" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = getSessionUserId(session)

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as { gameSummary?: AnyGame }
    const { gameSummary } = body

    if (!gameSummary?.id) {
      return NextResponse.json({ error: "Missing gameSummary or id" }, { status: 400 })
    }

    const now = new Date()

    const finalDoc: AnyGame = {
      ...gameSummary,
      userId,
      createdAt: gameSummary.createdAt ? new Date(gameSummary.createdAt) : now,
      updatedAt: now,
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const collection = db.collection<AnyGame>("games")

    await collection.updateOne(
      { id: finalDoc.id, userId: finalDoc.userId },
      { $set: finalDoc },
      { upsert: true },
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("POST /api/games error:", err)
    return NextResponse.json({ error: "Failed to save game" }, { status: 500 })
  }
}
