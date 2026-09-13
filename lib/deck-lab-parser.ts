import { parseSampleDeck } from '../utils/sample-hands'
import { parseDeckCardLine, parseDeckSectionHeading, MAX_DECK_TEXT_LENGTH, MAX_DECK_LINES, type DeckSection } from './deck-import-security'
import { parseIdsFromText } from './deck-parser'
import { normalizeDeckText } from './deck-text'

export type LabCard = { id: string; name: string; count: number; exact: boolean; code?: string; section: DeckSection }
export function parseLabDeck(input: string) {
  const text = normalizeDeckText(input)
  const empty = (error: string) => ({ cards: [] as LabCard[], total: 0, valid: false, errors: [error], exactIds: [] as string[] })
  if (text.length > MAX_DECK_TEXT_LENGTH || text.split(/\r?\n/).length > MAX_DECK_LINES) return empty('Deck list is too large.')
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/.test(text)) return empty('Deck list contains unsupported text.')
  const original = parseSampleDeck(text)
  const entries = new Map<string, LabCard>()
  const errors = [...original.errors]
  // The ported parser supplies canonical set-number counts. Raw name-only lines
  // remain supported because this lab samples raw hands, not legal openings.
  const exact = parseIdsFromText(text)
  let section: DeckSection = 'unknown'
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    const heading = parseDeckSectionHeading(line)
    if (heading) { section = heading; continue }
    if (!line || /^total cards\s*:\s*\d*$/i.test(line)) continue
    const card = parseDeckCardLine(line)
    if (card) {
      const id = `${card.setCode}-${card.number}`
      if (!entries.has(id)) entries.set(id, { id, name: card.name, count: exact.counts.get(id)!, exact: true, section, code: `${card.setCode.toUpperCase()} ${card.number.toUpperCase()}` })
      else if (entries.get(id)!.section !== section) entries.get(id)!.section = 'unknown'
    } else {
      const parsed = line.match(/^(\d+)\s+(.+)$/)
      if (!parsed) continue
      // A malformed exact-looking line must not become an unrelated name-only card.
      if (/\s+[A-Z0-9.]{2,15}\s+[A-Z]{0,4}\d/i.test(parsed[2]) || /(?:javascript\s*:|data\s*:|\b(?:window|document|process)\s*\.|\b(?:eval|fetch|alert)\s*\()/i.test(line)) { errors.push('Invalid exact card line. Use a name, set code and card number.'); continue }
      const name = parsed[2].trim().replace(/\s+/g, ' ')
      const id = `text:${name.toLocaleLowerCase('en-US')}`
      const previous = entries.get(id)
      entries.set(id, { id, name: previous?.name ?? name, count: (previous?.count ?? 0) + Number(parsed[1]), exact: false, section: previous && previous.section !== section ? 'unknown' : section })
    }
  }
  const cards = [...entries.values()]
  const total = cards.reduce((sum, card) => sum + card.count, 0)
  if (total !== 60 && !errors.length) errors.push(`Exactly 60 cards are required; this list contains ${total}.`)
  return { cards, total, valid: errors.length === 0 && total === 60, errors, exactIds: cards.filter(card => card.exact).map(card => card.id) }
}
