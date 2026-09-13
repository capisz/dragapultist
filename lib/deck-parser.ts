import { parseDeckCardLine, parseDeckSectionHeading, type DeckSection } from "./deck-import-security"

type ParsedDeckText = {
  fullIds: string[]
  uniqueIds: string[]
  counts: Map<string, number>
  totalCount: number
  sectionCounts: Record<DeckSection, number>
}

export function parseIdsFromText(text: string): ParsedDeckText {
    const fullIds: string[] = []
    const counts = new Map<string, number>()
    const sectionCounts: Record<DeckSection, number> = {
      pokemon: 0,
      trainer: 0,
      energy: 0,
      unknown: 0,
    }
    let currentSection: DeckSection = "unknown"
    let totalCount = 0

    const lines = text.split(/\r?\n/)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const nextSection = parseDeckSectionHeading(trimmed)
      if (nextSection) {
        currentSection = nextSection
        continue
      }

      const cardLine = parseDeckCardLine(trimmed)
      if (cardLine) {
        const cardId = `${cardLine.setCode}-${cardLine.number}`

        totalCount += cardLine.count
        sectionCounts[currentSection] += cardLine.count

        for (let i = 0; i < cardLine.count; i++) {
          fullIds.push(cardId)
        }
        counts.set(cardId, (counts.get(cardId) || 0) + cardLine.count)
      }
    }

    const uniqueIds = Array.from(new Set(fullIds))

    return {
      fullIds,
      uniqueIds,
      counts,
      totalCount,
      sectionCounts,
    }
  }

export function getDeckValidationError(parsed: ParsedDeckText) {
    if (!parsed.uniqueIds.length) {
      return "Couldn't find any card IDs like PAF 7 / OBF 162 in the text. Make sure lines look like '4 Charmander PAF 7'."
    }

    if (parsed.sectionCounts.unknown > 0) {
      return "Every card must appear under a Pokemon, Trainer, or Energy heading."
    }

    if (parsed.sectionCounts.pokemon < 1) {
      return "Deck list must include at least 1 Pokemon."
    }

    if (parsed.sectionCounts.energy < 1) {
      return "Deck list must include at least 1 Energy card."
    }

    if (parsed.totalCount !== 60) {
      return `Deck list must total exactly 60 cards. This list currently totals ${parsed.totalCount}.`
    }

    return null
  }
