import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getRequestUserId } from "@/lib/request-user"
import { assertMutationRequest } from "@/lib/session"
import { APP_DATABASE_NAME } from "@/lib/app-database"

const MAX_IMAGE_CHARS = 1_500_000
const MAX_TOTAL_IMAGE_CHARS = 2_500_000
class ProfileInputError extends Error {}

function normalizeImageField(value: unknown): { provided: boolean; value: string | null } {
  if (value === undefined) return { provided: false, value: null }
  if (value === null) return { provided: true, value: null }
  if (typeof value !== "string") throw new ProfileInputError("Image fields must be strings or null.")

  const trimmed = value.trim()
  if (!trimmed) return { provided: true, value: null }
  if (!/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed)) {
    throw new ProfileInputError("Image must be a PNG, JPEG, WebP, or GIF base64 data URL.")
  }
  if (trimmed.length > MAX_IMAGE_CHARS) {
    throw new ProfileInputError("Image is too large.")
  }

  return { provided: true, value: trimmed }
}

export async function PUT(req: NextRequest) {
  try {
    await assertMutationRequest(req)
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 })
  }

  try {
    const userId = await getRequestUserId()
    if (!userId) {
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
    const db = client.db(APP_DATABASE_NAME)
    const users = db.collection("users")

    const existing = await users.findOne(
      { firebaseUid: userId },
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

    const result = await users.updateOne({ firebaseUid: userId }, { $set: updateDoc })

    if (!result.matchedCount) {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      avatarImage: avatar.provided ? avatar.value : undefined,
      bannerImage: banner.provided ? banner.value : undefined,
    })
  } catch (err) {
    if (err instanceof ProfileInputError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 })
    }
    console.error("PUT /api/account/profile error:", err)
    return NextResponse.json({ ok: false, error: "Failed to update profile." }, { status: 500 })
  }
}
