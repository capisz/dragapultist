// app/api/games/[id]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

function getUserObjectId(session: any) {
  const id = session?.user?.id
  return typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : null
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const userId = getUserObjectId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB)

  await db.collection("games").deleteOne({ userId, gameId: params.id })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const userId = getUserObjectId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const gameSummary = body?.gameSummary
  if (!gameSummary?.id || gameSummary.id !== params.id) {
    return NextResponse.json({ error: "gameSummary.id must match route id" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB)

  await db.collection("games").updateOne(
    { userId, gameId: params.id },
    { $set: { gameSummary, updatedAt: new Date() } },
  )

  return NextResponse.json({ ok: true })
}
