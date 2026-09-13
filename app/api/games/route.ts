import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getRequestIdentity, userIdQueryValue } from "@/lib/request-user"
import type { ObjectId } from "mongodb"
import { assertMutationRequest } from "@/lib/session"
import { createHash } from "node:crypto"
import { createGameRequestSchema, gameInputSchema, GAME_PARSER_VERSION, GAME_SCHEMA_VERSION } from "@/lib/game-contract"
import { errorEnvelope } from "@/lib/api-contract"
import { gameDocumentToDetail, gameDocumentToSummary } from "@/lib/game-document"
import { analyzeGameLog } from "@/utils/game-analyzer"
import { APP_DATABASE_NAME } from "@/lib/app-database"

type AnyGame = {
  id: string
  userId?: string | ObjectId | null
  [key: string]: any
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function GET(req: NextRequest) {
  try {
    const identity = await getRequestIdentity()
    const userId = identity.userId

    // Guest: return empty list (avoid UI error states)
    if (!userId) {
      return NextResponse.json(errorEnvelope(identity.status === "invalid" ? "SESSION_EXPIRED" : "UNAUTHORIZED", "Sign in to load account games."), { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(APP_DATABASE_NAME)
    const collection = db.collection<AnyGame>("games")

    const { searchParams } = new URL(req.url)
    const usernameParam = searchParams.get("username")
    const limitParam = searchParams.get("limit")
    const search = searchParams.get("q")?.trim().slice(0, 80)
    const maximum = 100
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), maximum) : 50

    const query: any = { userId: userIdQueryValue(userId) }
    if (usernameParam && usernameParam.trim() !== "") {
      const regex = new RegExp(escapeRegex(usernameParam.slice(0, 80)), "i")
      query.$or = [{ username: regex }, { opponent: regex }]
    }
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i")
      query.$or = [
        { username: regex },
        { opponent: regex },
        { userMainAttacker: regex },
        { opponentMainAttacker: regex },
        { userOtherPokemon: regex },
        { opponentOtherPokemon: regex },
        { "tags.text": regex },
        { privateSearchText: regex },
        { rawLog: regex },
      ]
    }

    const cursor = searchParams.get("cursor")
    if (cursor) {
      const separator = cursor.lastIndexOf("|")
      const cursorDate = new Date(separator > 0 ? cursor.slice(0, separator) : "")
      const cursorId = separator > 0 ? cursor.slice(separator + 1) : ""
      if (cursor.length > 240 || Number.isNaN(cursorDate.getTime()) || !/^[A-Za-z0-9_.:-]{1,128}$/.test(cursorId)) {
        return NextResponse.json(errorEnvelope("VALIDATION_ERROR", "Invalid pagination cursor."), { status: 400 })
      }
      query.$and = [{
        $or: [
          { createdAt: { $lt: cursorDate } },
          { createdAt: cursorDate, id: { $gt: cursorId } },
        ],
      }]
    }

    const projection = { rawLog: 0, notes: 0, deckList: 0 }
    const games = await collection.find(query, { projection }).sort({ createdAt: -1, id: 1 }).limit(limit + 1).toArray()
    const hasMore = games.length > limit
    const page = hasMore ? games.slice(0, limit) : games
    const lastCreatedAt = page.at(-1)?.createdAt
    const nextCursor = hasMore && lastCreatedAt instanceof Date && page.at(-1)?.id
      ? `${lastCreatedAt.toISOString()}|${page.at(-1)?.id}`
      : null
    return NextResponse.json({ games: page.map(game => gameDocumentToSummary(game)), nextCursor })
  } catch (err) {
    console.error("GET /api/games error:", err)
    return NextResponse.json(errorEnvelope("UNAVAILABLE", "Game history is temporarily unavailable.", true), { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await assertMutationRequest(req)
  } catch {
    return NextResponse.json(errorEnvelope("FORBIDDEN", "Invalid secure request."), { status: 403 })
  }

  try {
    const identity = await getRequestIdentity()
    const userId = identity.userId

    if (!userId) {
      return NextResponse.json(errorEnvelope(identity.status === "invalid" ? "SESSION_EXPIRED" : "UNAUTHORIZED", "Sign in to save this game."), { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const requestPayload = createGameRequestSchema.safeParse(body)
    const legacyPayload = gameInputSchema.safeParse(body?.gameSummary)
    if (!requestPayload.success && !legacyPayload.success) {
      return NextResponse.json(errorEnvelope("VALIDATION_ERROR", "Invalid or oversized game payload."), { status: 400 })
    }
    const gameSummary = requestPayload.success ? requestPayload.data.game : legacyPayload.success ? legacyPayload.data : null
    if (!gameSummary) {
      return NextResponse.json(errorEnvelope("VALIDATION_ERROR", "Invalid or oversized game payload."), { status: 400 })
    }
    const idempotencyKey = requestPayload.success ? requestPayload.data.idempotencyKey : undefined

    const now = new Date()

    const authoritative = analyzeGameLog(
      gameSummary.rawLog,
      false,
      undefined,
      undefined,
      gameSummary.userArchetype,
      gameSummary.opponentArchetype,
      gameSummary.username,
    )
    const normalizedLog = gameSummary.rawLog.replace(/\r\n/g, "\n").trim()
    const contentHash = createHash("sha256").update(`${userId}\0${normalizedLog}`).digest("hex")
    const finalDoc: AnyGame = {
      ...authoritative,
      id: gameSummary.id,
      date: gameSummary.date,
      rawLog: gameSummary.rawLog,
      tags: gameSummary.tags ?? authoritative.tags,
      notes: gameSummary.notes ?? {},
      deckList: gameSummary.deckList ?? "",
      deckName: gameSummary.deckName ?? "",
      favorite: gameSummary.favorite ?? false,
      noteCount: Object.values(gameSummary.notes ?? {}).filter(note => note.trim()).length,
      hasDeck: Boolean(gameSummary.deckList?.trim()),
      privateSearchText: [
        gameSummary.username, gameSummary.opponent, gameSummary.userMainAttacker, gameSummary.opponentMainAttacker,
        ...gameSummary.userOtherPokemon, ...gameSummary.opponentOtherPokemon,
        ...(gameSummary.tags ?? []).map(tag => tag.text), ...Object.values(gameSummary.notes ?? {}),
      ].join("\n").slice(0, 24_000),
      userId,
      contentHash,
      idempotencyKey,
      schemaVersion: GAME_SCHEMA_VERSION,
      parserVersion: GAME_PARSER_VERSION,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    }

    const client = await clientPromise
    const db = client.db(APP_DATABASE_NAME)
    const collection = db.collection<AnyGame>("games")

    const duplicate = await collection.findOne({
      userId: userIdQueryValue(userId),
      $or: [{ contentHash }, ...(idempotencyKey ? [{ idempotencyKey }] : [])],
    })
    if (duplicate) {
      const game = gameDocumentToDetail(duplicate)
      return NextResponse.json({ game, revision: game.revision, saveState: "saved", duplicate: true })
    }

    await collection.updateOne(
      { id: finalDoc.id, userId: userIdQueryValue(userId) },
      { $set: finalDoc },
      { upsert: true },
    )

    const game = gameDocumentToDetail(finalDoc)
    return NextResponse.json({ game, revision: game.revision, saveState: "saved", duplicate: false }, { status: 201 })
  } catch (err) {
    console.error("POST /api/games error:", err)
    return NextResponse.json(errorEnvelope("UNAVAILABLE", "The game could not be saved. Your local draft is unchanged.", true), { status: 503 })
  }
}
