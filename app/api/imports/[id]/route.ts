import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getRequestUserObjectId } from "@/lib/request-user"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params
  const userObjectId = await getRequestUserObjectId()
  if (!userObjectId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || "dragapultist")

  const doc = await db.collection("imports").findOne({
    _id: new ObjectId(id),
    userId: userObjectId,
  })

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ import: doc })
}
