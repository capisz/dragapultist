"use client"

import { useEffect, useRef, useState } from "react"
import type { User } from "@/types/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react"
import type { OverallStatsModel } from "./types"

interface UserProfileProps {
  user: User
  stats: OverallStatsModel
  deckCount: number
  lastPlayedLabel: string
}

const MAX_CLIENT_IMAGE_CHARS = 1_350_000
const DEFAULT_BANNER_IMAGE = "/account-default-banner.jpg"
const DEFAULT_AVATAR_IMAGE = "/dreepy-nobg.png"

async function toResizedDataUrl(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.9,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a valid image file.")
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Could not read that image file."))
      img.src = objectUrl
    })

    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Image processing failed.")
    ctx.drawImage(image, 0, 0, width, height)

    let dataUrl = canvas.toDataURL("image/webp", quality)
    if (dataUrl.length > MAX_CLIENT_IMAGE_CHARS) {
      dataUrl = canvas.toDataURL("image/jpeg", Math.max(0.72, quality - 0.16))
    }
    if (dataUrl.length > MAX_CLIENT_IMAGE_CHARS) {
      throw new Error("Image is too large. Try a smaller image.")
    }

    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function UserProfile({ user, stats, deckCount, lastPlayedLabel }: UserProfileProps) {
  const initial = (user.username?.charAt(0) || "U").toUpperCase()
  const [avatarImage, setAvatarImage] = useState<string | null>(user.avatarImage ?? null)
  const [bannerImage, setBannerImage] = useState<string | null>(user.bannerImage ?? null)
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false)
  const [savingField, setSavingField] = useState<"avatar" | "banner" | null>(null)
  const [error, setError] = useState("")
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const bannerInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setAvatarImage(user.avatarImage ?? null)
    setBannerImage(user.bannerImage ?? null)
  }, [user.avatarImage, user.bannerImage])

  useEffect(() => {
    setAvatarLoadFailed(false)
  }, [avatarImage])

  useEffect(() => {
    setBannerLoadFailed(false)
  }, [bannerImage])

  async function persistProfileImages(updates: { avatarImage?: string | null; bannerImage?: string | null }) {
    setError("")
    const response = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Failed to update profile image.")
    }
  }

  async function handleAvatarFileChange(file: File | null) {
    if (!file) return
    setSavingField("avatar")
    try {
      const dataUrl = await toResizedDataUrl(file, 512, 512, 0.9)
      await persistProfileImages({ avatarImage: dataUrl })
      setAvatarImage(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set avatar image.")
    } finally {
      setSavingField(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  async function handleBannerFileChange(file: File | null) {
    if (!file) return
    setSavingField("banner")
    try {
      const dataUrl = await toResizedDataUrl(file, 1800, 500, 0.88)
      await persistProfileImages({ bannerImage: dataUrl })
      setBannerImage(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set banner image.")
    } finally {
      setSavingField(null)
      if (bannerInputRef.current) bannerInputRef.current.value = ""
    }
  }

  async function clearAvatar() {
    setSavingField("avatar")
    setError("")
    try {
      await persistProfileImages({ avatarImage: null })
      setAvatarImage(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar image.")
    } finally {
      setSavingField(null)
    }
  }

  async function clearBanner() {
    setSavingField("banner")
    setError("")
    try {
      await persistProfileImages({ bannerImage: null })
      setBannerImage(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove banner image.")
    } finally {
      setSavingField(null)
    }
  }

  return (
    <Card className="h-fit self-start overflow-hidden rounded-3xl border border-slate-200/60 bg-white/50 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700/40 dark:bg-[#1b3048]/55 dark:shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void handleBannerFileChange(event.target.files?.[0] ?? null)}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void handleAvatarFileChange(event.target.files?.[0] ?? null)}
      />

      <div className="relative h-24">
        {!bannerLoadFailed ? (
          <img
            src={bannerImage ?? DEFAULT_BANNER_IMAGE}
            alt="Profile banner"
            className="h-full w-full object-cover"
            onError={() => setBannerLoadFailed(true)}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-[#3b608c]/35 via-[#5e82ab]/35 to-[#93b7df]/40 dark:from-[#203a59]/60 dark:via-[#345275]/55 dark:to-[#4e6f95]/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/30 to-transparent" />
        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 rounded-full bg-white/90 px-2 text-[11px] text-slate-700 hover:bg-white dark:bg-slate-800/85 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={() => bannerInputRef.current?.click()}
            disabled={savingField !== null}
          >
            {savingField === "banner" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          </Button>
          {bannerImage ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 rounded-full bg-white/90 px-2 text-[11px] text-slate-700 hover:bg-white dark:bg-slate-800/85 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={() => void clearBanner()}
              disabled={savingField !== null}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      <CardHeader className="-mt-10 pb-3">
        <div className="flex items-end gap-3">
          <div className="relative h-16 w-16">
            {!avatarLoadFailed ? (
              <img
                src={avatarImage ?? DEFAULT_AVATAR_IMAGE}
                alt="Profile avatar"
                className={`h-full w-full rounded-2xl border border-white/85 shadow-sm dark:border-slate-900 ${
                  avatarImage
                    ? "object-cover"
                    : "object-contain bg-[#5e82ab] p-1.5 ring-1 ring-black/10 dark:bg-[#b1cce8] dark:ring-white/15"
                }`}
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/70 bg-[#5e82ab] text-2xl font-bold text-slate-50 shadow-sm dark:border-slate-900 dark:bg-[#b1cce8] dark:text-[#0b1220]">
                {initial}
              </div>
            )}
            <button
              type="button"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={() => avatarInputRef.current?.click()}
              disabled={savingField !== null}
              aria-label="Upload avatar image"
            >
              {savingField === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            {avatarImage ? (
              <button
                type="button"
                className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={() => void clearAvatar()}
                disabled={savingField !== null}
                aria-label="Remove avatar image"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            ) : null}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-xl tracking-tight text-slate-700/90 dark:text-sky-100">{user.username}</CardTitle>
            <p className="truncate text-sm text-slate-600 dark:text-slate-300/80">{user.email}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-[#dce9f7] text-[#31557d] dark:bg-[#2a455f]/70 dark:text-sky-100">
            {stats.totalGames} games
          </Badge>
          <Badge variant="secondary" className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-100">
            {stats.wins} wins
          </Badge>
          <Badge variant="secondary" className="bg-slate-200/90 text-slate-700 dark:bg-slate-600/75 dark:text-slate-100">
            {stats.winRate.toFixed(1)}% WR
          </Badge>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-600 dark:text-slate-300/80">Deck archetypes played</dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">{deckCount}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-600 dark:text-slate-300/80">Most played archetype</dt>
            <dd className="max-w-[60%] truncate text-right font-semibold text-slate-900 dark:text-slate-100">
              {stats.mostPlayedDeck}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-600 dark:text-slate-300/80">Best archetype (3+ games)</dt>
            <dd className="max-w-[60%] truncate text-right font-semibold text-slate-900 dark:text-slate-100">
              {stats.mostSuccessfulDeck}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-600 dark:text-slate-300/80">Last game</dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">{lastPlayedLabel}</dd>
          </div>
        </dl>

        {error ? (
          <p className="rounded-lg border border-rose-300/60 bg-rose-50/80 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/50 dark:bg-rose-950/35 dark:text-rose-200">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
