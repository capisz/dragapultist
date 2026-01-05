import { NextResponse } from "next/server"
import { auth } from "@/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

function getUserId(session: any) {
  const id = session?.user?.id
  return typeof id === "string" && ObjectId.isValid(id) ? id : null
}

export async function GET() {
  const session = await auth()
  const uid = getUserId(session)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB)

  const imports = await db
    .collection("imports")
    .find({ userId: new ObjectId(uid) })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray()

  return NextResponse.json({ imports })
}

export async function POST(req: Request) {
  const session = await auth()
  const uid = getUserId(session)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const rawText = body?.rawText
  const parsed = body?.parsed ?? null
  const title = body?.title ?? null

  if (typeof rawText !== "string" || rawText.trim().length < 10) {
    return NextResponse.json({ error: "rawText required" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB)

  const doc = {
    userId: new ObjectId(uid),
    title,
    rawText,
    parsed,
    createdAt: new Date(),
  }

  const res = await db.collection("imports").insertOne(doc)
  return NextResponse.json({ id: res.insertedId.toString() })
}
