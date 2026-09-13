export type DeckSection = "pokemon" | "trainer" | "energy" | "unknown"

export type ParsedDeckCardLine = {
  count: number
  name: string
  setCode: string
  number: string
}

export const MAX_DECK_TEXT_LENGTH = 12_000
export const MAX_DECK_LINES = 200

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
const SECTION_PATTERN = /^(pok(?:e|é)mon|trainer|energy)\s*:\s*(?:\d{1,2})?\s*$/i
const CARD_LINE_PATTERN = /^\s*(\d{1,2})\s+(.{1,120}?)\s+([A-Z0-9.]{2,15})\s+([A-Z]{0,4}\d{1,4}(?:_[A-Z0-9]{1,3}|[A-Z])?)\s*$/iu
const SAFE_CARD_NAME_PATTERN = /^[\p{L}\p{M}\p{N} .,'’():/&+!?\-♀♂]+$/u
const CODE_LIKE_PATTERN =
  /(?:javascript\s*:|data\s*:|on\w+\s*=|\b(?:alert|confirm|prompt|eval|function|fetch|require|import|setTimeout|setInterval)\s*\(|\b(?:document|window|globalThis|process)\s*\.)/i

export function parseDeckSectionHeading(line: string): DeckSection | null {
  const match = line.match(SECTION_PATTERN)
  if (!match) return null

  const heading = match[1].toLowerCase()
  if (heading === "trainer" || heading === "energy") return heading
  return "pokemon"
}

export function parseDeckCardLine(line: string): ParsedDeckCardLine | null {
  const match = line.match(CARD_LINE_PATTERN)
  if (!match) return null

  const count = Number(match[1])
  const name = match[2].trim()

  if (count < 1 || count > 60) return null
  if (!SAFE_CARD_NAME_PATTERN.test(name) || CODE_LIKE_PATTERN.test(name)) return null

  return {
    count,
    name,
    setCode: match[3].toLowerCase(),
    number: match[4].toLowerCase(),
  }
}

export function getDeckImportSecurityError(text: string) {
  if (text.length > MAX_DECK_TEXT_LENGTH) {
    return `Deck list is too large. Keep it under ${MAX_DECK_TEXT_LENGTH.toLocaleString()} characters.`
  }

  if (CONTROL_CHARACTER_PATTERN.test(text)) {
    return "Deck list contains unsupported control characters."
  }

  const lines = text.split(/\r?\n/)
  if (lines.length > MAX_DECK_LINES) {
    return `Deck list has too many lines. Keep it under ${MAX_DECK_LINES} lines.`
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || parseDeckSectionHeading(line)) continue

    if (!parseDeckCardLine(line)) {
      return "Deck list contains unsupported text. Use section headings and card lines like '4 Charmander PAF 7'."
    }
  }

  return null
}
