import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { APP_DATABASE_NAME } from "@/lib/app-database"
import { getRequestUserId, userIdQueryValue } from "@/lib/request-user"
import { buildStatistics } from "@/components/statistics/statistics-utils"
import { gameDocumentToSummary } from "@/lib/game-document"
import { errorEnvelope } from "@/lib/api-contract"

const STATISTICS_LIMIT = 5_000
const HISTORY_PAGE_SIZE = 100

export async function GET() {
  try {
    const userId = await getRequestUserId()
    if (!userId) return NextResponse.json(errorEnvelope("UNAUTHORIZED", "Sign in to load account statistics."), { status: 401 })

    const client = await clientPromise
    const db = client.db(APP_DATABASE_NAME)
    const games = await db.collection("games")
      .find(
        { userId: userIdQueryValue(userId) },
        { projection: { rawLog: 0, notes: 0, deckList: 0 } },
      )
      .sort({ createdAt: -1, id: 1 })
      .limit(STATISTICS_LIMIT + 1)
      .toArray()

    const truncated = games.length > STATISTICS_LIMIT
    const sourceGames = truncated ? games.slice(0, STATISTICS_LIMIT) : games
    const historyGames = sourceGames.slice(0, HISTORY_PAGE_SIZE)
    const lastCreatedAt = historyGames.at(-1)?.createdAt

    return NextResponse.json({
      model: buildStatistics(sourceGames),
      historyGames: historyGames.map(game => gameDocumentToSummary(game)),
      historyNextCursor: sourceGames.length > HISTORY_PAGE_SIZE && lastCreatedAt instanceof Date && historyGames.at(-1)?.id
        ? `${lastCreatedAt.toISOString()}|${historyGames.at(-1)?.id}`
        : null,
      sourceGameCount: sourceGames.length,
      truncated,
    })
  } catch (error) {
    console.error("GET /api/statistics error:", error)
    return NextResponse.json(errorEnvelope("UNAVAILABLE", "Statistics are temporarily unavailable.", true), { status: 503 })
  }
}
