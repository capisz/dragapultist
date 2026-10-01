import { POKEAPI_POKEMON_IDS } from "./pokeapi-sprite-ids"
import localPixelSprites from "./local-pixel-sprites.json"

const localPixelSpriteIds = new Set<number>(localPixelSprites)

export const POKEAPI_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon"

export const FALLBACK_POKEMON_SPRITE = "/sprites/substitute.png"

interface SpriteCandidateOptions {
  includeFallback?: boolean
}

export interface PokemonSpriteOption {
  id: string
  label: string
  spriteUrl: string
  spriteUrls: string[]
}

const TRAINER_PREFIX_TOKENS = new Set([
  "cynthias",
  "ethans",
  "hops",
  "lillies",
  "marnies",
  "ns",
  "rockets",
])

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

export function normalizePokemonSpriteId(value: string): string {
  const basename = value.split(/[\\/]/).pop() ?? value

  return basename
    .trim()
    .toLowerCase()
    .replace(/\.(png|webp|gif|svg)$/i, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function normalizePokemonSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function formatPokemonSpriteLabel(spriteId: string): string {
  const normalized = normalizePokemonSpriteId(spriteId)
  if (!normalized) return "Unknown"

  return normalized
    .split("-")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ")
}

export function stripPokemonOwnerPrefix(name: string): string {
  return name.replace(/^[^'’]+['’]s\s+/i, "").trim()
}

export function getPokeApiPokemonSpriteNumber(spriteRef: string): number | null {
  const spriteId = normalizePokemonSpriteId(spriteRef)
  if (!spriteId) return null

  return POKEAPI_POKEMON_IDS[spriteId as keyof typeof POKEAPI_POKEMON_IDS] ?? null
}

// Every surface uses the same still, full-body front sprite. A missing sprite
// falls back to the neutral substitute, never to artwork or miniature icons.
export function getPokeApiPokemonSpriteUrls(spriteRef: string): string[] {
  const pokemonNumber = getPokeApiPokemonSpriteNumber(spriteRef)
  return pokemonNumber ? [`${POKEAPI_SPRITE_BASE}/${pokemonNumber}.png`] : []
}

export function getLocalPokemonSpriteUrls(spriteRef: string): string[] {
  const number = getPokeApiPokemonSpriteNumber(spriteRef)
  return number && localPixelSpriteIds.has(number) ? [`/pokemon/${number}.png`] : []
}

export function getPokemonSpriteCandidateSources(
  spriteRef: string,
  options: SpriteCandidateOptions = {},
): string[] {
  return uniquePreserveOrder([
    ...getLocalPokemonSpriteUrls(spriteRef),
    ...getPokeApiPokemonSpriteUrls(spriteRef),
    options.includeFallback !== false ? FALLBACK_POKEMON_SPRITE : "",
  ])
}

export function getPokemonSpritePrimarySource(
  spriteRef: string,
  options: SpriteCandidateOptions = {},
): string {
  return getPokemonSpriteCandidateSources(spriteRef, options)[0] ?? FALLBACK_POKEMON_SPRITE
}

function spriteIdsForDisplayName(displayName: string): string[] {
  const raw = stripPokemonOwnerPrefix(displayName)
  const normalized = normalizePokemonSearchText(raw)
  if (!normalized) return []

  const base = normalized
    .replace(/\b(?:ex|gx|v|vmax|vstar)\b/g, " ")
    .replace(/\bmask\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const tokens = base
    .split(" ")
    .filter(Boolean)
    .filter((token) => !TRAINER_PREFIX_TOKENS.has(token))

  if (tokens.length === 0) return []

  if (tokens.includes("ogerpon")) {
    const tokenSet = new Set(tokens)
    if (tokenSet.has("wellspring")) return ["ogerpon-wellspring", "ogerpon-wellspring-mask", "ogerpon"]
    if (tokenSet.has("hearthflame")) return ["ogerpon-hearthflame", "ogerpon-hearthflame-mask", "ogerpon"]
    if (tokenSet.has("cornerstone")) return ["ogerpon-cornerstone", "ogerpon-cornerstone-mask", "ogerpon"]
    return ["ogerpon"]
  }

  const slugs = [tokens.join("-")]

  if (tokens[0] === "mega" && tokens.length > 1) {
    slugs.unshift(`${tokens.slice(1).join("-")}-mega`)
  }

  if (tokens.length >= 2) {
    slugs.push([...tokens.slice(1), tokens[0]].join("-"))
  }

  return uniquePreserveOrder(slugs)
}

export function getPokemonSpriteCandidateSourcesForDisplayName(
  displayName: string,
  options: SpriteCandidateOptions = {},
): string[] {
  const spriteIds = spriteIdsForDisplayName(displayName)
  const candidates = spriteIds.flatMap((spriteId) =>
    getPokemonSpriteCandidateSources(spriteId, { ...options, includeFallback: false }),
  )

  return uniquePreserveOrder([...candidates, FALLBACK_POKEMON_SPRITE])
}

export function getKnownPokemonSpriteOptions(): PokemonSpriteOption[] {
  return Object.keys(POKEAPI_POKEMON_IDS)
    .map((id) => {
      const spriteUrls = getPokemonSpriteCandidateSources(id)
      return {
        id,
        label: formatPokemonSpriteLabel(id),
        spriteUrl: spriteUrls[0] ?? FALLBACK_POKEMON_SPRITE,
        spriteUrls,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

// Keep externally supplied candidates within the same default sprite style.
export function pixelSpriteCandidates(sources: string[]): string[] {
  return sources.filter(source => source.startsWith('/pokemon/') || source === FALLBACK_POKEMON_SPRITE ||
    (source.startsWith(`${POKEAPI_SPRITE_BASE}/`) && /^\d+\.png$/.test(source.slice(POKEAPI_SPRITE_BASE.length + 1))))
}
