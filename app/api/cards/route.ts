import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { cardRequestSchema } from "@/lib/card-contract"
import { promises as fs } from "fs"

export const runtime = "nodejs"

type IndexedCard = {
  id: string
  name: string
  image?: string
  set: string
  number: string | number
}

type CardIndex = {
  sourceCommit?: string | null
  cardsById: Record<string, IndexedCard>
  setCodeToId: Record<string, string>
  setIdsByCode?: Record<string, string[]>
  setNameById?: Record<string, string>
  setNameByCode?: Record<string, string>
}

const CARD_INDEX_PATH = path.join(
  process.cwd(),
  "data",
  "generated",
  "card-index.json",
)

let cardIndexPromise: Promise<CardIndex> | null = null

const MAX_REQUEST_BODY_LENGTH = 20_000

function normalize(value: string | number | undefined | null) {
  return String(value ?? "").trim().toLowerCase()
}

function buildId(setId: string, number: string) {
  return `${normalize(setId)}-${normalize(number)}`
}

async function loadCardIndex(): Promise<CardIndex> {
  if (!cardIndexPromise) {
    cardIndexPromise = fs
      .readFile(CARD_INDEX_PATH, "utf8")
      .then((raw) => JSON.parse(raw) as CardIndex)
      .catch((error) => {
        cardIndexPromise = null
        throw error
      })
  }

  return cardIndexPromise
}

function resolveCard(rawId: string, index: CardIndex) {
  const [liveSetCode, cardNumber] = rawId.split("-")
  if (!liveSetCode || !cardNumber) return null

  const code = normalize(liveSetCode)
  const number = normalize(cardNumber)
  const canonicalSetId = index.setCodeToId[code] ?? code

  const candidates = [canonicalSetId, code, ...(index.setIdsByCode?.[code] ?? [])]
  const match = candidates.map(setId => index.cardsById[buildId(setId, number)]).find(Boolean)

  if (!match) return null

  return {
    id: rawId,
    name: match.name,
    image: match.image,
    set: match.set,
    number: match.number || cardNumber,
  }
}

function getSetDisplayName(setCode: string | undefined, index: CardIndex) {
  if (!setCode) return "Unknown Set"

  const code = normalize(setCode)
  const canonicalSetId = index.setCodeToId[code] ?? code

  return (
    index.setNameByCode?.[code] ??
    index.setNameById?.[canonicalSetId] ??
    canonicalSetId.toUpperCase()
  )
}

function placeholderCard(rawId: string, index: CardIndex) {
  const [setCode, number] = rawId.split("-")

  return {
    id: rawId,
    name: `Card ${rawId.toUpperCase()}`,
    image: undefined,
    set: getSetDisplayName(setCode, index),
    number: number?.toUpperCase() ?? "??",
  }
}

export async function POST(req: NextRequest) {
  try {
    const declaredLength = Number(req.headers.get("content-length") ?? 0)
    if (declaredLength > MAX_REQUEST_BODY_LENGTH) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 })
    }

    const chunks: Uint8Array[] = []
    const reader = req.body?.getReader()
    let size = 0
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > MAX_REQUEST_BODY_LENGTH) {
            await reader.cancel()
            return NextResponse.json({ error: "Request is too large." }, { status: 413 })
          }
          chunks.push(value)
        }
      } finally { reader.releaseLock() }
    }
    const rawBody = Buffer.concat(chunks).toString("utf8")

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 })
    }

    const parsed = cardRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Include up to 256 valid card IDs." }, { status: 400 })
    }
    const ids = parsed.data.ids.map(normalize)

    if (!ids.length) {
      return NextResponse.json({ cards: [] }, { status: 200 })
    }

    const index = await loadCardIndex()
    const missingIds: string[] = []
    const cards = ids.map((rawId) => {
      const card = resolveCard(rawId, index)
      if (card) return card

      missingIds.push(rawId)
      return placeholderCard(rawId, index)
    })

    return NextResponse.json({ cards, missingIds }, { status: 200 })
  } catch (err) {
    console.error("Error in /api/cards:", err)
    return NextResponse.json(
      {
        error:
          "The local card index is unavailable.",
      },
      { status: 500 },
    )
  }
}

type SearchCard = { name: string; code: string; normalizedName: string; set?: string; number?: string; image?: string }
let searchIndex: SearchCard[] | undefined

/** Build once per process, grouping cards by set instead of scanning all cards per alias. */
function searchableCards(index: CardIndex): SearchCard[] {
  if (searchIndex) return searchIndex
  const bySet = new Map<string, IndexedCard[]>()
  for (const card of Object.values(index.cardsById)) {
    const set = card.id.slice(0, card.id.lastIndexOf('-'))
    const cards = bySet.get(set) ?? []
    cards.push(card)
    bySet.set(set, cards)
  }
  const aliases = Object.entries(index.setCodeToId)
  const aliasedSets = new Set(aliases.filter(([code, set]) => code !== set).map(([, set]) => set))
  const matches = new Map<string, SearchCard>()
  for (const [code, setId] of aliases) {
    if (code === setId && aliasedSets.has(setId)) continue
    for (const set of new Set([setId, code, ...(index.setIdsByCode?.[code] ?? [])])) {
      for (const card of bySet.get(set) ?? []) {
        const resolved = resolveCard(`${code}-${card.number}`, index)
        if (resolved?.name !== card.name) continue
        const importCode = `${code.toUpperCase()} ${card.number}`
        matches.set(importCode, {
          name: card.name,
          code: importCode,
          normalizedName: normalize(card.name),
          set: resolved.set,
          number: String(resolved.number),
          image: resolved.image,
        })
      }
    }
  }
  searchIndex = [...matches.values()].sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code, undefined, { numeric: true }))
  return searchIndex
}

/** Exact names first; retain the existing alphabetical and numeric code ordering. */
export async function GET(request: NextRequest) {
  const q = normalize(request.nextUrl.searchParams.get('q'))
  if (q.length < 2 || q.length > 80) return NextResponse.json({ cards: [] })
  try {
    const cards = searchableCards(await loadCardIndex())
    const exact: SearchCard[] = [], partial: SearchCard[] = []
    for (const card of cards) {
      if (card.normalizedName === q) exact.push(card)
      else if (partial.length < 12 && card.normalizedName.includes(q)) partial.push(card)
      if (exact.length === 12) break
    }
    return NextResponse.json({ cards: [...exact, ...partial].slice(0, 12).map(({ normalizedName: _normalizedName, ...card }) => card) })
  } catch { return NextResponse.json({ error: 'Card search unavailable' }, { status: 503 }) }
}
