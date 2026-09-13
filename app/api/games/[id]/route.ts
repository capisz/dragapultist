// app/api/games/[id]/route.ts
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getRequestIdentity, userIdQueryValue } from "@/lib/request-user"
import { assertMutationRequest } from "@/lib/session"
import { deleteGameRequestSchema, gameInputSchema, gameMetadataSchema } from "@/lib/game-contract"
import { analyzeGameLog } from "@/utils/game-analyzer"
import { z } from "zod"
import { APP_DATABASE_NAME } from "@/lib/app-database"
import { errorEnvelope } from "@/lib/api-contract"
import { gameDocumentToDetail } from "@/lib/game-document"

type RouteContext = { params: Promise<{ id: string }> }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

const expectedRevisionSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional()

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params
  const identity = await getRequestIdentity()
  const userId = identity.userId
  if (!userId) return NextResponse.json(errorEnvelope(identity.status === "invalid" ? "SESSION_EXPIRED" : "UNAUTHORIZED", "Sign in to access this game."), { status: 401 })
  const client = await clientPromise
  const db = client.db(APP_DATABASE_NAME)
  const game = await db.collection("games").findOne({ userId: userIdQueryValue(userId), $or: [{ id }, { gameId: id }] })
  return game ? NextResponse.json({ game: gameDocumentToDetail(game) }) : NextResponse.json(errorEnvelope("NOT_FOUND", "Game not found."), { status: 404 })
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await assertMutationRequest(request)
  } catch {
    return NextResponse.json(errorEnvelope("FORBIDDEN", "Invalid secure request."), { status: 403 })
  }
  const { id } = await params
  const identity = await getRequestIdentity()
  const userId = identity.userId
  if (!userId) return NextResponse.json(errorEnvelope(identity.status === "invalid" ? "SESSION_EXPIRED" : "UNAUTHORIZED", "Sign in to delete this game."), { status: 401 })

  const client = await clientPromise
  const db = client.db(APP_DATABASE_NAME)

  const body = await request.json().catch(() => ({}))
  const parsed = deleteGameRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(errorEnvelope("VALIDATION_ERROR", "Invalid delete request."), { status: 400 })
  }

  const ownerFilter = {
    userId: userIdQueryValue(userId),
    $or: [{ id }, { gameId: id }],
  }
  const deleteFilter = parsed.data.expectedRevision === undefined
    ? ownerFilter
    : { ...ownerFilter, revision: parsed.data.expectedRevision }

  const result = await db.collection("games").deleteOne(deleteFilter)
  if (!result.deletedCount && parsed.data.expectedRevision !== undefined) {
    const exists = await db.collection("games").findOne(ownerFilter, { projection: { _id: 1 } })
    if (exists) {
      return NextResponse.json(errorEnvelope("REVISION_CONFLICT", "This game changed in another session. Reload before deleting it."), { status: 409 })
    }
  }
  if (result.deletedCount) {
    await Promise.all([
      db.collection("imports").deleteMany({ userId: userIdQueryValue(userId), gameId: id }),
      db.collection("prizeMaps").deleteMany({ userId: userIdQueryValue(userId), gameId: id }),
    ])
  }
  return NextResponse.json({ ok: true, deleted: Boolean(result.deletedCount) })
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    await assertMutationRequest(req)
  } catch {
    return NextResponse.json(errorEnvelope("FORBIDDEN", "Invalid secure request."), { status: 403 })
  }
  const { id } = await params
  const identity = await getRequestIdentity()
  const userId = identity.userId
  if (!userId) return NextResponse.json(errorEnvelope(identity.status === "invalid" ? "SESSION_EXPIRED" : "UNAUTHORIZED", "Sign in to update this game."), { status: 401 })

  const body = await req.json().catch(() => null)
  const gameSummary = isRecord(body) && isRecord(body.gameSummary) ? body.gameSummary : null
  const parsed = gameInputSchema.safeParse(gameSummary)
  const expectedRevision = expectedRevisionSchema.safeParse(isRecord(body) ? body.expectedRevision : undefined)
  if (!parsed.success || parsed.data.id !== id || !expectedRevision.success) {
    return NextResponse.json(errorEnvelope("VALIDATION_ERROR", "The game ID or revision is invalid."), { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(APP_DATABASE_NAME)
  const now = new Date()
  const authoritative = analyzeGameLog(
    parsed.data.rawLog,
    false,
    undefined,
    undefined,
    parsed.data.userArchetype,
    parsed.data.opponentArchetype,
    parsed.data.username,
  )

  const ownerFilter = {
    userId: userIdQueryValue(userId),
    $or: [{ id }, { gameId: id }],
  }
  const updateFilter = expectedRevision.data === undefined
    ? ownerFilter
    : { ...ownerFilter, revision: expectedRevision.data }

  const result = await db.collection("games").updateOne(
    updateFilter,
    {
      $set: {
        ...authoritative,
        id,
        date: parsed.data.date,
        rawLog: parsed.data.rawLog,
        tags: parsed.data.tags ?? authoritative.tags,
        notes: parsed.data.notes ?? {},
        deckList: parsed.data.deckList ?? "",
        deckName: parsed.data.deckName ?? "",
        favorite: parsed.data.favorite ?? false,
        userId,
        updatedAt: now,
      },
      $inc: { revision: 1 },
      $unset: { gameSummary: "" },
    },
  )

  if (!result.matchedCount) {
    const exists = await db.collection("games").findOne(ownerFilter, { projection: { _id: 1 } })
    if (exists && expectedRevision.data !== undefined) {
      return NextResponse.json(errorEnvelope("REVISION_CONFLICT", "This game changed in another session. Reload before saving again."), { status: 409 })
    }
    return NextResponse.json(errorEnvelope("NOT_FOUND", "Game not found."), { status: 404 })
  }

  const game = await db.collection("games").findOne(ownerFilter)
  if (!game) return NextResponse.json(errorEnvelope("NOT_FOUND", "Game not found."), { status: 404 })
  const detail = gameDocumentToDetail(game)
  return NextResponse.json({ game: detail, revision: detail.revision, saveState: "saved" })
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    await assertMutationRequest(req)
  } catch {
    return NextResponse.json(errorEnvelope("FORBIDDEN", "Invalid secure request."), { status: 403 })
  }

  const { id } = await params
  const identity = await getRequestIdentity()
  const userId = identity.userId
  if (!userId) return NextResponse.json(errorEnvelope(identity.status === "invalid" ? "SESSION_EXPIRED" : "UNAUTHORIZED", "Sign in to update this game."), { status: 401 })

  const body = await req.json().catch(() => null)
  const changes = gameMetadataSchema.safeParse(isRecord(body) ? body.changes : null)
  const expectedRevision = expectedRevisionSchema.safeParse(isRecord(body) ? body.expectedRevision : undefined)
  if (!changes.success || !expectedRevision.success) {
    return NextResponse.json(errorEnvelope("VALIDATION_ERROR", "Invalid game update."), { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(APP_DATABASE_NAME)
  const ownerFilter = { userId: userIdQueryValue(userId), $or: [{ id }, { gameId: id }] }
  const currentForSearch = await db.collection("games").findOne(ownerFilter)
  if (!currentForSearch) return NextResponse.json(errorEnvelope("NOT_FOUND", "Game not found."), { status: 404 })
  const { perspective, ...editableChanges } = changes.data
  const derivedMetadata = {
    ...(changes.data.notes ? { noteCount: Object.values(changes.data.notes).filter(note => note.trim()).length } : {}),
    ...(changes.data.deckList !== undefined ? { hasDeck: Boolean(changes.data.deckList.trim()) } : {}),
    privateSearchText: [
      perspective?.username ?? currentForSearch.username,
      currentForSearch.opponent,
      currentForSearch.userMainAttacker,
      currentForSearch.opponentMainAttacker,
      ...(Array.isArray(currentForSearch.userOtherPokemon) ? currentForSearch.userOtherPokemon : []),
      ...(Array.isArray(currentForSearch.opponentOtherPokemon) ? currentForSearch.opponentOtherPokemon : []),
      ...((changes.data.tags ?? currentForSearch.tags ?? []) as Array<{ text?: unknown }>).map(tag => String(tag.text ?? "")),
      ...Object.values((changes.data.notes ?? currentForSearch.notes ?? {}) as Record<string, unknown>).map(String),
    ].join("\n").slice(0, 24_000),
  }
  let authoritativeChanges: Record<string, unknown> = {}
  if (perspective) {
    const reparsed = analyzeGameLog(
      String(currentForSearch.rawLog), false, undefined, undefined,
      perspective.userArchetype, perspective.opponentArchetype, perspective.username,
    ) as unknown as Record<string, unknown>
    const { id: _id, rawLog: _rawLog, tags: _tags, notes: _notes, deckList: _deckList, deckName: _deckName, ...derived } = reparsed
    authoritativeChanges = derived
  }
  const updateFilter = expectedRevision.data === undefined
    ? ownerFilter
    : { ...ownerFilter, revision: expectedRevision.data }
  const result = await db.collection("games").updateOne(
    updateFilter,
    { $set: { ...authoritativeChanges, ...editableChanges, ...derivedMetadata, updatedAt: new Date() }, $inc: { revision: 1 } },
  )

  if (!result.matchedCount) {
    const exists = await db.collection("games").findOne(ownerFilter, { projection: { _id: 1 } })
    if (exists && expectedRevision.data !== undefined) {
      return NextResponse.json(errorEnvelope("REVISION_CONFLICT", "This game changed in another session. Reload before saving again."), { status: 409 })
    }
    return NextResponse.json(errorEnvelope("NOT_FOUND", "Game not found."), { status: 404 })
  }

  const game = await db.collection("games").findOne(ownerFilter)
  if (!game) return NextResponse.json(errorEnvelope("NOT_FOUND", "Game not found."), { status: 404 })
  const detail = gameDocumentToDetail(game)
  return NextResponse.json({ game: detail, revision: detail.revision, saveState: "saved" })
}
