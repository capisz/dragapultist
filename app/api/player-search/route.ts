// app/api/player-search/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getRequestUserId, userIdQueryValue } from "@/lib/request-user"
import { APP_DATABASE_NAME } from "@/lib/app-database"
import { allowRequest } from "@/lib/rate-limit"
import { errorEnvelope } from "@/lib/api-contract"
import { publicPlayerResultsSchema } from "@/lib/player-contract"

type GameDoc = {
  username: string
  opponent?: string
  userWon: boolean
  userMainAttacker?: string
  opponentMainAttacker?: string
  userArchetype?: string | null
  opponentArchetype?: string | null
  date?: string
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserId()
    if (!userId) return NextResponse.json(errorEnvelope("UNAUTHORIZED", "Sign in to search your player history."), { status: 401 })
    if (!allowRequest(`player-search:${userId}`, 30, 60_000)) {
      return NextResponse.json(errorEnvelope("RATE_LIMITED", "Too many player searches. Try again shortly.", true), { status: 429 })
    }
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get("query") || "").trim().slice(0, 80)
    if (!query) return NextResponse.json({ players: [] })

    const client = await clientPromise
    const db = client.db(APP_DATABASE_NAME)
    const collection = db.collection<GameDoc>("games")

    const regex = new RegExp(escapeRegex(query), "i")

    const pipeline = [
      { $match: { userId: userIdQueryValue(userId) } },
      {
        $project: {
          participants: [
            {
              username: "$username",
              won: "$userWon",
              archetypeId: { $ifNull: ["$userArchetype", null] },
              mainAttacker: "$userMainAttacker",
              lastPlayed: "$date",
            },
            {
              username: "$opponent",
              won: { $eq: ["$userWon", false] },
              archetypeId: { $ifNull: ["$opponentArchetype", null] },
              mainAttacker: "$opponentMainAttacker",
              lastPlayed: "$date",
            },
          ],
        },
      },
      { $unwind: "$participants" },
      { $match: { "participants.username": { $regex: regex } } },
      {
        $facet: {
          players: [
            {
              $group: {
                _id: "$participants.username",
                totalGames: { $sum: 1 },
                wins: { $sum: { $cond: ["$participants.won", 1, 0] } },
                lastPlayed: { $max: "$participants.lastPlayed" },
                decksUsed: { $addToSet: "$participants.mainAttacker" },
              },
            },
            { $sort: { totalGames: -1 } },
            { $limit: 25 },
          ],
          deckStats: [
            {
              $group: {
                _id: {
  username: "$participants.username",
  archetypeId: "$participants.archetypeId",
},

                games: { $sum: 1 },
                wins: { $sum: { $cond: ["$participants.won", 1, 0] } },
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

    return NextResponse.json(publicPlayerResultsSchema.parse({ players }), { headers: { "Cache-Control": "private, no-store" } })
  } catch (err) {
    console.error("GET /api/player-search error:", err)
    return NextResponse.json(errorEnvelope("UNAVAILABLE", "Player data is temporarily unavailable.", true), { status: 503 })
  }
}
