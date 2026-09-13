// app/api/player-deck-breakdown/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getRequestUserId, userIdQueryValue } from "@/lib/request-user"
import { APP_DATABASE_NAME } from "@/lib/app-database"
import { allowRequest } from "@/lib/rate-limit"
import { errorEnvelope } from "@/lib/api-contract"
import { publicDeckBreakdownResponseSchema } from "@/lib/player-contract"

type GameDoc = {
  username: string
  opponent?: string
  userWon: boolean
  userArchetype?: string | null
  opponentArchetype?: string | null
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserId()
    if (!userId) return NextResponse.json(errorEnvelope("UNAUTHORIZED", "Sign in to load your player history."), { status: 401 })
    if (!allowRequest(`player-deck:${userId}`, 60, 60_000)) {
      return NextResponse.json(errorEnvelope("RATE_LIMITED", "Too many matchup requests. Try again shortly.", true), { status: 429 })
    }
    const { searchParams } = new URL(req.url)
    const username = (searchParams.get("username") || "").trim().slice(0, 80)
    const archetypeIdRaw = (searchParams.get("archetypeId") || "").trim().slice(0, 120)

    if (!username) return NextResponse.json(errorEnvelope("VALIDATION_ERROR", "A username is required."), { status: 400 })

    const wantUnknown = !archetypeIdRaw || archetypeIdRaw === "__unknown__"

    const client = await clientPromise
    const db = client.db(APP_DATABASE_NAME)
    const collection = db.collection<GameDoc>("games")

    const usernameRegex = new RegExp(`^${escapeRegex(username)}$`, "i")

    const participantMatch: any = { "participants.username": { $regex: usernameRegex } }
    if (wantUnknown) {
      participantMatch.$or = [{ "participants.archetypeId": null }, { "participants.archetypeId": { $exists: false } }]
    } else {
      participantMatch["participants.archetypeId"] = archetypeIdRaw
    }

    const pipeline = [
      { $match: { userId: userIdQueryValue(userId) } },
      {
        $project: {
          participants: [
            {
              username: "$username",
              won: "$userWon",
              archetypeId: { $ifNull: ["$userArchetype", null] },
              opponentArchetypeId: { $ifNull: ["$opponentArchetype", null] },
            },
            {
              username: "$opponent",
              won: { $eq: ["$userWon", false] },
              archetypeId: { $ifNull: ["$opponentArchetype", null] },
              opponentArchetypeId: { $ifNull: ["$userArchetype", null] },
            },
          ],
        },
      },
      { $unwind: "$participants" },
      { $match: participantMatch },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                games: { $sum: 1 },
                wins: { $sum: { $cond: ["$participants.won", 1, 0] } },
              },
            },
          ],
          matchups: [
            {
              $group: {
                _id: "$participants.opponentArchetypeId",
                games: { $sum: 1 },
                wins: { $sum: { $cond: ["$participants.won", 1, 0] } },
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

    return NextResponse.json(publicDeckBreakdownResponseSchema.parse({
      breakdown: {
        archetypeId: wantUnknown ? null : archetypeIdRaw,
        games,
        wins,
        losses,
        winRate,
        matchups,
      },
    }), { headers: { "Cache-Control": "private, no-store" } })
  } catch (err) {
    console.error("GET /api/player-deck-breakdown error:", err)
    return NextResponse.json(errorEnvelope("UNAVAILABLE", "Matchup data is temporarily unavailable.", true), { status: 503 })
  }
}
