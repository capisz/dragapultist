// app/api/prize-maps/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { parseGameTurns } from "@/utils/game-analyzer"

function cleanName(name: string): string {
  // same logic you use in GameDetail
  return name.replace(/^.*'s\s/, "").trim()
}

function buildWinnerPrizeSequence(game: any, winnerMainAttacker: string): string[] {
  const turns = parseGameTurns(game.rawLog)

  const userMain = game.userMainAttacker || ""
  const oppMain = game.opponentMainAttacker || ""

  const winnerIsUser =
    (game.userWon && cleanName(userMain) === cleanName(winnerMainAttacker)) ||
    (!game.userWon && cleanName(oppMain) === cleanName(winnerMainAttacker))

  const loserMain = winnerIsUser ? oppMain : userMain
  const loserOthers = winnerIsUser ? game.opponentOtherPokemon || [] : game.userOtherPokemon || []

  const loserNames = [loserMain, ...loserOthers].map(cleanName).filter(Boolean)

  const sequence: string[] = []

  for (const turn of turns) {
    const actions = winnerIsUser ? turn.userActions : turn.opponentActions
    if (!actions) continue

    for (const action of actions) {
      if (!action.includes("Knocked Out")) continue

      const match = loserNames.find((name) => name && action.includes(name))
      if (match) {
        sequence.push(match)
      }
    }
  }

  return sequence
}

export async function POST(req: NextRequest) {
  try {
    const { winnerMainAttacker, loserMainAttacker } = await req.json()

    if (!winnerMainAttacker || !loserMainAttacker) {
      return NextResponse.json(
        { error: "winnerMainAttacker and loserMainAttacker are required" },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB)
    const gamesCol = db.collection("games")

    // Fetch games for this matchup from either perspective
    const games = await gamesCol
      .find({
        $or: [
          {
            userWon: true,
            userMainAttacker: winnerMainAttacker,
            opponentMainAttacker: loserMainAttacker,
          },
          {
            userWon: false,
            opponentMainAttacker: winnerMainAttacker,
            userMainAttacker: loserMainAttacker,
          },
        ],
      })
      .toArray()

    if (!games.length) {
      return NextResponse.json({ totalGames: 0, sequences: [] })
    }

    const map = new Map<string, { sequence: string[]; count: number }>()
    let totalWithSequence = 0

    for (const game of games) {
      const seq = buildWinnerPrizeSequence(game, winnerMainAttacker)
      if (!seq.length) continue

      totalWithSequence++
      const key = seq.join(" -> ")
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
      } else {
        map.set(key, { sequence: seq, count: 1 })
      }
    }

    if (!totalWithSequence) {
      return NextResponse.json({ totalGames: 0, sequences: [] })
    }

    const sequences = Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map((entry) => ({
        sequence: entry.sequence,
        count: entry.count,
        percentage: (entry.count / totalWithSequence) * 100,
      }))

    return NextResponse.json({
      totalGames: totalWithSequence,
      sequences,
    })
  } catch (error) {
    console.error("Error in /api/prize-maps", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
