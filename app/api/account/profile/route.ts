import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getRequestUserObjectId } from "@/lib/request-user"

const MAX_IMAGE_CHARS = 1_500_000
const MAX_TOTAL_IMAGE_CHARS = 2_500_000

function normalizeImageField(value: unknown): { provided: boolean; value: string | null } {
  if (value === undefined) return { provided: false, value: null }
  if (value === null) return { provided: true, value: null }
  if (typeof value !== "string") throw new Error("Image fields must be strings or null.")

  const trimmed = value.trim()
  if (!trimmed) return { provided: true, value: null }
  if (!trimmed.startsWith("data:image/") || !trimmed.includes(";base64,")) {
    throw new Error("Image must be a base64 data URL.")
  }
  if (trimmed.length > MAX_IMAGE_CHARS) {
    throw new Error("Image is too large.")
  }

  return { provided: true, value: trimmed }
}

export async function PUT(req: NextRequest) {
  try {
    const userObjectId = await getRequestUserObjectId()
    if (!userObjectId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as {
      avatarImage?: unknown
      bannerImage?: unknown
    }

    const avatar = normalizeImageField(body.avatarImage)
    const banner = normalizeImageField(body.bannerImage)

    if (!avatar.provided && !banner.provided) {
      return NextResponse.json({ ok: false, error: "No profile fields provided." }, { status: 400 })
    }

    const updateDoc: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (avatar.provided) updateDoc.avatarImage = avatar.value
    if (banner.provided) updateDoc.bannerImage = banner.value

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "dragapultist")
    const users = db.collection("users")

    const existing = await users.findOne(
      { _id: userObjectId },
      { projection: { avatarImage: 1, bannerImage: 1 } },
    )

    const effectiveAvatar =
      avatar.provided ? avatar.value : typeof existing?.avatarImage === "string" ? existing.avatarImage : null
    const effectiveBanner =
      banner.provided ? banner.value : typeof existing?.bannerImage === "string" ? existing.bannerImage : null

    const totalChars = (effectiveAvatar?.length ?? 0) + (effectiveBanner?.length ?? 0)
    if (totalChars > MAX_TOTAL_IMAGE_CHARS) {
      return NextResponse.json({ ok: false, error: "Combined image size is too large." }, { status: 400 })
    }

    const result = await users.updateOne({ _id: userObjectId }, { $set: updateDoc })

    if (!result.matchedCount) {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      avatarImage: avatar.provided ? avatar.value : undefined,
      bannerImage: banner.provided ? banner.value : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile."
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
