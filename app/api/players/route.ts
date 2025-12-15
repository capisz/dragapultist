import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DB_NAME =
  process.env.MONGODB_DB ??
  process.env.MONGODB_DB_NAME ??
  "dragapultist"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query")
    const username = searchParams.get("username")

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const gamesCol = db.collection("games")
    // 1) Search mode: /api/players?query=cap
    if (query) {
      const pipeline = [
        {
          $match: {
            username: { $regex: query, $options: "i" },
          },
        },
        {
          $group: {
            _id: "$username",
            totalGames: { $sum: 1 },
            wins: { $sum: { $cond: ["$userWon", 1, 0] } },
          },
        },
        { $sort: { totalGames: -1 } },
        { $limit: 25 },
      ]

      const docs = await gamesCol.aggregate(pipeline).toArray()

      const players = docs.map((doc: any) => {
        const totalGames = doc.totalGames || 0
        const wins = doc.wins || 0
        const losses = totalGames - wins
        return {
          username: doc._id as string,
          totalGames,
          wins,
          losses,
          winRate: totalGames ? (wins * 100) / totalGames : 0,
        }
      })

      return NextResponse.json({ players })
    }

    // 2) Detail mode: /api/players?username=capisz
    if (username) {
      const pipeline = [
        { $match: { username } },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalGames: { $sum: 1 },
                  wins: { $sum: { $cond: ["$userWon", 1, 0] } },
                },
              },
            ],
            decks: [
              {
                $group: {
                  _id: "$userArchetype",
                  games: { $sum: 1 },
                  wins: { $sum: { $cond: ["$userWon", 1, 0] } },
                },
              },
              { $sort: { games: -1 } },
              { $limit: 10 },
            ],
            recentGames: [
              { $sort: { date: -1 } },
              { $limit: 20 },
              {
                $project: {
                  _id: 0,
                  id: 1,
                  date: 1,
                  opponent: 1,
                  userMainAttacker: 1,
                  opponentMainAttacker: 1,
                  userWon: 1,
                  damageDealt: 1,
                  userPrizeCardsTaken: 1,
                  opponentPrizeCardsTaken: 1,
                },
              },
            ],
          },
        },
      ]

      const [result] = await gamesCol.aggregate(pipeline).toArray()
      const summary = result?.summary?.[0]

      if (!summary) {
        return NextResponse.json({ error: "Player not found" }, { status: 404 })
      }

      const totalGames = summary.totalGames || 0
      const wins = summary.wins || 0
      const losses = totalGames - wins

      return NextResponse.json({
        username,
        totalGames,
        wins,
        losses,
        winRate: totalGames ? (wins * 100) / totalGames : 0,
        decks: result.decks.map((d: any) => ({
          mainAttacker: d._id,
          games: d.games,
          wins: d.wins,
          winRate: d.games ? (d.wins * 100) / d.games : 0,
        })),
        recentGames: result.recentGames,
      })
    }

    return NextResponse.json(
      { error: "Provide either ?query= for search or ?username= for stats." },
      { status: 400 },
    )
  } catch (error) {
    console.error("Error in /api/players", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
