import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import clientPromise from "@/lib/mongodb"

const schema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(6).max(200),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB)

  const existing = await db.collection("users").findOne({ email })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await db.collection("users").insertOne({
    name,
    email,
    passwordHash,
    createdAt: new Date(),
  })

  return NextResponse.json({ ok: true })
}
