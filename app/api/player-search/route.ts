// app/api/player-search/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

type GameDoc = {
  username: string
  userWon: boolean
  userMainAttacker?: string
  userArchetype?: string | null
  date?: string
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get("query") || "").trim()
    if (!query) return NextResponse.json({ players: [] })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const collection = db.collection<GameDoc>("games")

    const regex = new RegExp(escapeRegex(query), "i")

    const pipeline = [
      { $match: { username: { $regex: regex } } },
      {
        $facet: {
          players: [
            {
              $group: {
                _id: "$username",
                totalGames: { $sum: 1 },
                wins: { $sum: { $cond: [{ $eq: ["$userWon", true] }, 1, 0] } },
                lastPlayed: { $max: "$date" },
                decksUsed: { $addToSet: "$userMainAttacker" },
              },
            },
            { $sort: { totalGames: -1 } },
            { $limit: 25 },
          ],
          deckStats: [
            {
              $group: {
                _id: {
  username: "$username",
  archetypeId: { $ifNull: ["$userArchetype", null] },
},

                games: { $sum: 1 },
                wins: { $sum: { $cond: [{ $eq: ["$userWon", true] }, 1, 0] } },
              },
            },
            {
              $group: {
                _id: "$_id.username",
                deckStats: {
                  $push: {
                    archetypeId: "$_id.archetypeId",
                    games: "$games",
                    wins: "$wins",
                  },
                },
              },
            },
          ],
        },
      },
    ] as any[]

    const [result] = await collection.aggregate(pipeline).toArray()
    const basePlayers = (result?.players ?? []) as any[]
    const deckStatsArr = (result?.deckStats ?? []) as any[]

    const deckStatsByUser = new Map<string, any[]>()
    for (const row of deckStatsArr) {
      deckStatsByUser.set(row._id as string, (row.deckStats ?? []) as any[])
    }

    const players = basePlayers.map((p) => {
      const totalGames = Number(p.totalGames ?? 0)
      const wins = Number(p.wins ?? 0)
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

      const deckStatsRaw = deckStatsByUser.get(p._id as string) ?? []
      const deckStats = deckStatsRaw
        .map((d) => {
          const games = Number(d.games ?? 0)
          const dwins = Number(d.wins ?? 0)
          const dwr = games > 0 ? (dwins / games) * 100 : 0
          return {
            archetypeId: (d.archetypeId ?? null) as string | null,
            games,
            wins: dwins,
            winRate: dwr,
          }
        })
        .sort((a, b) => b.games - a.games)

      return {
        username: p._id as string,
        totalGames,
        wins,
        losses: totalGames - wins,
        winRate,
        lastPlayed: p.lastPlayed ?? null,
        decks: (p.decksUsed || []).filter(Boolean),
        deckStats,
      }
    })

    return NextResponse.json({ players })
  } catch (err) {
    console.error("GET /api/player-search error:", err)
    return NextResponse.json({ error: "Failed to search players" }, { status: 500 })
  }
}
