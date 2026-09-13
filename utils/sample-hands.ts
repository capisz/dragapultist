export type DeckCard = { name: string; count: number }
export type ParsedDeck = { cards: DeckCard[]; total: number; errors: string[]; valid: boolean }
export type RandomIndex = (exclusiveUpperBound: number) => number
export type HandSession = { hands: number; cards: { name: string; handsContaining: number; copiesDrawn: number }[] }

export function parseSampleDeck(text: string): ParsedDeck {
  const errors: string[] = []
  const cards = new Map<string, DeckCard>()
  if (text.length > 20000) return { cards: [], total: 0, errors: ['Deck text is too long. Use at most 20,000 characters.'], valid: false }
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim()
    if (!line || /^(?:pok[eé]mon|trainer|energy|total cards)\s*:\s*\d*$/i.test(line)) continue
    const match = line.match(/^(\d+)\s+(.+)$/)
    if (!match || Number(match[1]) < 1 || Number(match[1]) > 60) { errors.push(`Line ${index + 1}: use a count from 1 to 60 followed by a card name.`); continue }
    const name = match[2].trim().replace(/\s+/g, ' ')
    if (name.length > 200) { errors.push(`Line ${index + 1}: card name is too long.`); continue }
    const key = name.toLocaleLowerCase('en-US')
    const current = cards.get(key)
    cards.set(key, { name: current?.name ?? name, count: (current?.count ?? 0) + Number(match[1]) })
  }
  const entries = Array.from(cards.values())
  const total = entries.reduce((sum, card) => sum + card.count, 0)
  if (total !== 60) errors.push(`Exactly 60 cards are required; this list contains ${total}.`)
  return { cards: entries, total, errors, valid: errors.length === 0 }
}
export function physicalDeck(cards: DeckCard[]): string[] {
  if (cards.some(card => !card.name || !Number.isInteger(card.count) || card.count < 1 || card.count > 60) || cards.reduce((sum, card) => sum + card.count, 0) !== 60) throw new Error('An exact 60-card deck is required.')
  return cards.flatMap(card => Array<string>(card.count).fill(card.name))
}
export function sampleSeven(cards: DeckCard[], randomIndex: RandomIndex): string[] {
  const deck = physicalDeck(cards)
  for (let index = 0; index < 7; index++) {
    const offset = randomIndex(deck.length - index)
    if (!Number.isInteger(offset) || offset < 0 || offset >= deck.length - index) throw new Error('Random index is outside the requested range.')
    const selected = index + offset
    ;[deck[index], deck[selected]] = [deck[selected], deck[index]]
  }
  return deck.slice(0, 7)
}
// Rejection sampling removes modulo bias for any integer bound up to 60.
export function boundedRandom(nextUint32: () => number): RandomIndex {
  return upper => {
    if (!Number.isInteger(upper) || upper < 1 || upper > 60) throw new Error('Invalid random bound.')
    const limit = Math.floor(0x100000000 / upper) * upper
    let value: number
    do { value = nextUint32(); if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Expected an unsigned 32-bit integer.') } while (value >= limit)
    return value % upper
  }
}
export function seededRandom(seed: number): RandomIndex {
  let state = seed >>> 0
  return boundedRandom(() => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return (value ^ value >>> 14) >>> 0
  })
}
export function emptyHandSession(cards: DeckCard[]): HandSession {
  return { hands: 0, cards: cards.map(card => ({name:card.name, handsContaining:0, copiesDrawn:0})) }
}
export function addHands(session: HandSession, hands: string[][]): HandSession {
  return { hands: session.hands + hands.length, cards: session.cards.map(card => ({
    name: card.name,
    handsContaining: card.handsContaining + hands.filter(hand => hand.includes(card.name)).length,
    copiesDrawn: card.copiesDrawn + hands.reduce((sum, hand) => sum + hand.filter(name => name === card.name).length, 0),
  })) }
}
