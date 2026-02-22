import { readdir } from "node:fs/promises"
import path from "node:path"
import { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { formatPokemonSpriteLabel } from "@/utils/archetype-mapping"

type PokemonSpriteOption = {
  id: string
  label: string
}

let cachedOptions: PokemonSpriteOption[] | null = null

function toPokemonSpriteId(filename: string): string | null {
  if (!filename.toLowerCase().endsWith(".png")) return null
  const id = filename.replace(/\.png$/i, "").trim().toLowerCase()
  if (!id || id === "substitute") return null
  if (!/^[a-z0-9-]+$/.test(id)) return null
  return id
}

async function loadPokemonSpriteOptions(): Promise<PokemonSpriteOption[]> {
  if (cachedOptions) return cachedOptions

  const spritesDir = path.join(process.cwd(), "public", "sprites")
  const files = await readdir(spritesDir, { withFileTypes: true })

  const byId = new Map<string, PokemonSpriteOption>()
  for (const file of files) {
    if (!file.isFile()) continue
    const id = toPokemonSpriteId(file.name)
    if (!id || byId.has(id)) continue
    byId.set(id, { id, label: formatPokemonSpriteLabel(id) })
  }

  cachedOptions = Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label))
  return cachedOptions
}

function normalizeSearchQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
}

function scoreOption(option: PokemonSpriteOption, normalizedQuery: string): number {
  if (!normalizedQuery) return 0

  const idText = option.id.replace(/-/g, " ")
  const labelText = option.label.toLowerCase()

  if (option.id === normalizedQuery || labelText === normalizedQuery) return 6
  if (idText.startsWith(normalizedQuery) || labelText.startsWith(normalizedQuery)) return 5
  if (idText.includes(normalizedQuery) || labelText.includes(normalizedQuery)) return 4
  return 0
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = normalizeSearchQuery(searchParams.get("query") ?? "")
    const excludeId = (searchParams.get("exclude") ?? "").trim().toLowerCase()
    const rawLimit = Number.parseInt(searchParams.get("limit") ?? "", 10)
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 50)) : 20

    // Keep this endpoint query-driven so the client doesn't load the full list.
    if (!query) return NextResponse.json({ pokemon: [] })

    const allOptions = await loadPokemonSpriteOptions()
    const ranked = allOptions
      .filter((option) => !excludeId || option.id !== excludeId)
      .map((option) => ({ option, score: scoreOption(option, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.option.label.localeCompare(b.option.label))
      .slice(0, limit)
      .map((entry) => entry.option)

    return NextResponse.json({ pokemon: ranked })
  } catch (err) {
    console.error("GET /api/pokemon-sprites error:", err)
    return NextResponse.json({ pokemon: [] }, { status: 500 })
  }
}
