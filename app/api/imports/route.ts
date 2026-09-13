import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getRequestUserId, userIdQueryValue } from "@/lib/request-user"
import { assertMutationRequest } from "@/lib/session"
import { APP_DATABASE_NAME } from "@/lib/app-database"
import { importInputSchema } from "@/lib/import-contract"
import { createHash } from "node:crypto"

export async function GET() {
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await clientPromise
  const db = client.db(APP_DATABASE_NAME)

  const imports = await db
    .collection("imports")
    .find({ userId: userIdQueryValue(userId) })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()

  return NextResponse.json({ imports })
}

export async function POST(req: Request) {
  try {
    await assertMutationRequest(req)
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }
  const userId = await getRequestUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = importInputSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "Invalid import payload." }, { status: 400 })
  const { rawText, parsed = null, title = null } = body.data

  const client = await clientPromise
  const db = client.db(APP_DATABASE_NAME)
  const contentHash = createHash("sha256")
    .update(`${userId}\0${rawText.replace(/\r\n/g, "\n").trim()}`)
    .digest("hex")

  const existing = await db.collection("imports").findOne(
    { userId: userIdQueryValue(userId), contentHash },
    { projection: { _id: 1 } },
  )
  if (existing) return NextResponse.json({ id: existing._id.toString(), duplicate: true })

  const doc = {
    userId,
    title,
    rawText,
    parsed,
    contentHash,
    createdAt: new Date(),
  }

  const res = await db.collection("imports").insertOne(doc)
  return NextResponse.json({ id: res.insertedId.toString(), duplicate: false }, { status: 201 })
}
