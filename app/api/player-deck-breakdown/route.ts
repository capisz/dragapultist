// app/api/player-deck-breakdown/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

type GameDoc = {
  username: string
  userWon: boolean
  userArchetype?: string | null
  opponentArchetype?: string | null
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const username = (searchParams.get("username") || "").trim()
    const archetypeIdRaw = (searchParams.get("archetypeId") || "").trim()

    if (!username) return NextResponse.json({ breakdown: null }, { status: 400 })

    const wantUnknown = !archetypeIdRaw || archetypeIdRaw === "__unknown__"

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const collection = db.collection<GameDoc>("games")

    const usernameRegex = new RegExp(`^${escapeRegex(username)}$`, "i")

    const match: any = { username: { $regex: usernameRegex } }
    if (wantUnknown) {
      match.$or = [{ userArchetype: null }, { userArchetype: { $exists: false } }]
    } else {
      match.userArchetype = archetypeIdRaw
    }

    const pipeline = [
      { $match: match },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                games: { $sum: 1 },
                wins: { $sum: { $cond: [{ $eq: ["$userWon", true] }, 1, 0] } },
              },
            },
          ],
          matchups: [
            {
              $group: {
                _id: "$opponentArchetype",
                games: { $sum: 1 },
                wins: { $sum: { $cond: [{ $eq: ["$userWon", true] }, 1, 0] } },
              },
            },
            { $sort: { games: -1 } },
          ],
        },
      },
    ] as any[]

    const [result] = await collection.aggregate(pipeline).toArray()
    const overall = (result?.overall ?? [])[0]
    const matchupsRaw = (result?.matchups ?? []) as any[]

    const games = Number(overall?.games ?? 0)
    const wins = Number(overall?.wins ?? 0)
    const losses = games - wins
    const winRate = games > 0 ? (wins / games) * 100 : 0

    const matchups = matchupsRaw.map((m) => {
      const mgames = Number(m.games ?? 0)
      const mwins = Number(m.wins ?? 0)
      return {
        opponentArchetypeId: (m._id ?? null) as string | null,
        games: mgames,
        wins: mwins,
        winRate: mgames > 0 ? (mwins / mgames) * 100 : 0,
      }
    })

    return NextResponse.json({
      breakdown: {
        archetypeId: wantUnknown ? null : archetypeIdRaw,
        games,
        wins,
        losses,
        winRate,
        matchups,
      },
    })
  } catch (err) {
    console.error("GET /api/player-deck-breakdown error:", err)
    return NextResponse.json({ breakdown: null }, { status: 500 })
  }
}
