// app/api/games/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

type AnyGame = {
  id: string
  rawLog?: string
  username?: string
  opponent?: string
  userArchetype?: string | null
  opponentArchetype?: string | null
  winnerPrizePath?: string[]
  [key: string]: any
}

// Helper: pull the PTCGL handle from the log
function extractUsernameFromLog(rawLog?: string): string | null {
  if (!rawLog) return null

  const lines = rawLog.split(/\r?\n/)

  // 1) First, look for the "chose tails/heads" line
  for (const line of lines) {
    const coinFlipMatch = line.match(
      /^(.+?)\s+chose\s+(?:tails|heads)\s+for\s+the\s+opening\s+coin\s+flip/i,
    )
    if (coinFlipMatch?.[1]) {
      return coinFlipMatch[1].trim()
    }
  }

  // 2) Fallback: "won the coin toss"
  for (const line of lines) {
    const tossMatch = line.match(/^(.+?)\s+won\s+the\s+coin\s+toss/i)
    if (tossMatch?.[1]) {
      return tossMatch[1].trim()
    }
  }

  return null
}


export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const collection = db.collection<AnyGame>("games")

    const { searchParams } = new URL(req.url)
    const usernameParam = searchParams.get("username")
    const limitParam = searchParams.get("limit")

    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 1000) : 500

    const query: any = {}

    // Treat ?username= as "player name", and match either your username OR their opponent field
    if (usernameParam && usernameParam.trim() !== "") {
      const regex = new RegExp(usernameParam, "i")
      query.$or = [{ username: regex }, { opponent: regex }]
    }

    const games = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({ games })
  } catch (err) {
    console.error("GET /api/games error:", err)
    return NextResponse.json({ error: "Failed to load games" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { gameSummary?: AnyGame }
    const { gameSummary } = body

    if (!gameSummary || !gameSummary.id) {
      return NextResponse.json(
        { error: "Missing gameSummary or id in request body" },
        { status: 400 },
      )
    }

const usernameFromLog = extractUsernameFromLog(gameSummary.rawLog)
const username = gameSummary.username || usernameFromLog || "Guest"


    const now = new Date()

    const finalDoc: AnyGame = {
      ...gameSummary,
      username,
      createdAt: gameSummary["createdAt"] ? new Date(gameSummary["createdAt"]) : now,
      updatedAt: now,
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const collection = db.collection<AnyGame>("games")

    // Upsert by game.id so duplicates aren’t inserted twice
    await collection.updateOne(
      { id: finalDoc.id },
      { $set: finalDoc },
      { upsert: true },
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("POST /api/games error:", err)
    return NextResponse.json({ error: "Failed to save game" }, { status: 500 })
  }
}
