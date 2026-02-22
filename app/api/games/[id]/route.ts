// app/api/games/[id]/route.ts
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getRequestUserId, userIdQueryValue } from "@/lib/request-user"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || "dragapultist")

  await db.collection("games").deleteOne({
    userId: userIdQueryValue(userId),
    $or: [{ id: params.id }, { gameId: params.id }],
  })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const gameSummary = isRecord(body) && isRecord(body.gameSummary) ? body.gameSummary : null
  if (!gameSummary?.id || gameSummary.id !== params.id) {
    return NextResponse.json({ error: "gameSummary.id must match route id" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || "dragapultist")
  const now = new Date()
  const createdAt =
    typeof gameSummary.createdAt === "string" || gameSummary.createdAt instanceof Date
      ? new Date(gameSummary.createdAt)
      : now

  await db.collection("games").updateOne(
    {
      userId: userIdQueryValue(userId),
      $or: [{ id: params.id }, { gameId: params.id }],
    },
    {
      $set: {
        ...gameSummary,
        id: params.id,
        userId,
        createdAt,
        updatedAt: now,
      },
      $unset: { gameSummary: "" },
    },
    { upsert: true },
  )

  return NextResponse.json({ ok: true })
}
