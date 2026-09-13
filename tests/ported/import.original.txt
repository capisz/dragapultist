import { expect, it } from 'vitest'
import { getDeckImportSecurityError, parseDeckCardLine } from '../lib/deck-import-security'
import { getDeckValidationError, parseIdsFromText } from '../lib/deck-parser'
import { cardRequestSchema } from '../lib/card-contract'
import { FEATURED_DECKS } from '../lib/featured-decks'

it('parses gallery numbers, lowercase codes, and Unicode names', () => {
  expect(parseDeckCardLine('1 Oranguru BRS TG12')?.number).toBe('tg12')
  expect(parseDeckCardLine('1 Pokémon Center Lady meg 123')?.setCode).toBe('meg')
})
it('rejects executable markup, oversized input, and malformed lines', () => {
  expect(getDeckImportSecurityError('<script>alert(1)</script>')).not.toBeNull()
  expect(getDeckImportSecurityError('a'.repeat(12001))).not.toBeNull()
  expect(getDeckImportSecurityError('1 Bad\u0000Name PAF 7')).not.toBeNull()
})
it('accepts the complete featured decks and expands to exactly 60 copies', () => {
  for (const deck of FEATURED_DECKS) {
    expect(getDeckImportSecurityError(deck.importText), deck.id).toBeNull()
    const parsed = parseIdsFromText(deck.importText)
    expect(getDeckValidationError(parsed), deck.id).toBeNull()
    expect(parsed.fullIds.length).toBe(60)
  }
})
it('rejects invalid totals', () => {
  expect(getDeckValidationError(parseIdsFromText('Pokémon: 1\n1 Charmander PAF 7\nEnergy: 1\n1 Fire Energy SVE 2'))).toContain('60')
})
it('bounds API input and permits gallery IDs without permitting paths', () => {
  expect(cardRequestSchema.safeParse({ids:['brs-tg12','paf-7']}).success).toBe(true)
  expect(cardRequestSchema.safeParse({ids:['../../etc/passwd']}).success).toBe(false)
  expect(cardRequestSchema.safeParse({ids:Array(257).fill('paf-7')}).success).toBe(false)
})

import { normalizeDeckText } from '../lib/deck-text'
it('repairs encoded mobile clipboard deck text without bypassing validation', () => {
  const source = FEATURED_DECKS[0].importText
  for (const value of [source, encodeURIComponent(source), encodeURIComponent(encodeURIComponent(source))]) {
    expect(normalizeDeckText(value)).toBe(source)
    expect(getDeckValidationError(parseIdsFromText(normalizeDeckText(value)))).toBeNull()
  }
  expect(getDeckImportSecurityError(normalizeDeckText(encodeURIComponent('<script>alert(1)</script>')))).not.toBeNull()
  expect(normalizeDeckText('bad%20%ZZ')).toBe('bad%20%ZZ')
})
