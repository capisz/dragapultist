import { NextResponse } from "next/server"
import { auth } from "@/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const uid = (session?.user as any)?.id
  if (!uid || !ObjectId.isValid(uid)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB)

  const doc = await db.collection("imports").findOne({
    _id: new ObjectId(params.id),
    userId: new ObjectId(uid),
  })

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ import: doc })
}
