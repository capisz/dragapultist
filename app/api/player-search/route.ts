// app/api/player-search/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

type GameDoc = {
  username: string
  userWon: boolean
  userMainAttacker?: string
  date?: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get("query") || "").trim()

    if (!query) {
      return NextResponse.json({ players: [] })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const collection = db.collection<GameDoc>("games")

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")

    const pipeline = [
      { $match: { username: { $regex: regex } } },
      {
        $group: {
          _id: "$username",
          totalGames: { $sum: 1 },
          wins: {
            $sum: {
              $cond: [{ $eq: ["$userWon", true] }, 1, 0],
            },
          },
          lastPlayed: { $max: "$date" },
          decksUsed: { $addToSet: "$userMainAttacker" },
        },
      },
      { $sort: { totalGames: -1 } },
      { $limit: 25 },
    ]

    const agg = await collection.aggregate(pipeline).toArray()

    const players = agg.map((p) => {
      const winRate =
        p.totalGames > 0 ? Math.round((p.wins / p.totalGames) * 100) : 0
      return {
        username: p._id as string,
        totalGames: p.totalGames as number,
        wins: p.wins as number,
        losses: p.totalGames - p.wins,
        winRate,
        lastPlayed: p.lastPlayed ?? null,
        decks: (p.decksUsed || []).filter(Boolean),
      }
    })

    return NextResponse.json({ players })
  } catch (err) {
    console.error("GET /api/player-search error:", err)
    return NextResponse.json({ error: "Failed to search players" }, { status: 500 })
  }
}
