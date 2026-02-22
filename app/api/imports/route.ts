import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getRequestUserObjectId } from "@/lib/request-user"

export async function GET() {
  const userObjectId = await getRequestUserObjectId()
  if (!userObjectId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || "dragapultist")

  const imports = await db
    .collection("imports")
    .find({ userId: userObjectId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()

  return NextResponse.json({ imports })
}

export async function POST(req: Request) {
  const userObjectId = await getRequestUserObjectId()
  if (!userObjectId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const rawText = body?.rawText
  const parsed = body?.parsed ?? null
  const title = body?.title ?? null

  if (typeof rawText !== "string" || rawText.trim().length < 10) {
    return NextResponse.json({ error: "rawText required" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || "dragapultist")

  const doc = {
    userId: userObjectId,
    title,
    rawText,
    parsed,
    createdAt: new Date(),
  }

  const res = await db.collection("imports").insertOne(doc)
  return NextResponse.json({ id: res.insertedId.toString() })
}
