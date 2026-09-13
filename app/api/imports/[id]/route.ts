import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getRequestUserId, userIdQueryValue } from "@/lib/request-user"
import { APP_DATABASE_NAME } from "@/lib/app-database"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params
  const userId = await getRequestUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(APP_DATABASE_NAME)

  const doc = await db.collection("imports").findOne({
    _id: new ObjectId(id),
    userId: userIdQueryValue(userId),
  })

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ import: doc })
}
