import { z } from 'zod'
import { parseLabDeck } from '@/lib/deck-lab-parser'
import { canonicalizeArchetypeId } from '@/utils/archetype-mapping'
import { normalizeDeckText } from '@/lib/deck-text'

export const deckIdSchema = z.string().uuid()
export const deckAssignmentSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }).strict(),
  z.object({ mode: z.literal('explicit'), deckId: deckIdSchema }).strict(),
  z.object({ mode: z.literal('current'), capturedAt: z.string().datetime() }).strict(),
])
export type DeckAssignment = z.infer<typeof deckAssignmentSchema>
const deckText = z.string().max(36_000).transform(normalizeDeckText).superRefine((text, ctx) => {
  const parsed = parseLabDeck(text)
  if (!parsed.valid) ctx.addIssue({ code: 'custom', message: parsed.errors[0] || 'Exactly 60 cards are required.' })
})
export const createDeckSchema = z.object({
  id: deckIdSchema,
  name: z.string().trim().min(1).max(80),
  archetypeId: z.string().trim().min(1).max(120).refine(value => !!canonicalizeArchetypeId(value), 'Choose a recognized archetype.').transform(value => canonicalizeArchetypeId(value)!),
  deckList: deckText,
}).strict()
export const savedDeckSchema = z.object({
  id: deckIdSchema, name: z.string(), archetypeId: z.string(), deckList: z.string(),
  revision: z.number().int().min(1), createdAt: z.string().datetime(), archivedAt: z.string().datetime().nullable(),
}).strict()
export const deckLibrarySchema = z.object({
  decks: z.array(savedDeckSchema),
  currentDeckId: deckIdSchema.nullable(), revision: z.number().int().min(0),
  history: z.array(z.object({ at: z.string().datetime(), deckId: deckIdSchema.nullable() }).strict()),
}).strict()
export const updateDeckSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(), archived: z.literal(true).optional(),
  expectedRevision: z.number().int().min(1),
}).strict().refine(value => value.name !== undefined || value.archived === true, 'Choose a name or archive the list.')
export const currentDeckSchema = z.object({ deckId: deckIdSchema.nullable(), expectedRevision: z.number().int().min(0) }).strict()
export type SavedDeck = z.infer<typeof savedDeckSchema>
export type DeckLibrary = z.infer<typeof deckLibrarySchema>
export type CreateDeck = z.infer<typeof createDeckSchema>
export const emptyDeckLibrary = (): DeckLibrary => ({ decks: [], currentDeckId: null, revision: 0, history: [] })

export class DeckError extends Error {
  constructor(message: string, readonly code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'REVISION_CONFLICT') { super(message) }
}
export function createLibraryDeck(library: DeckLibrary, input: CreateDeck, at: string): DeckLibrary {
  const existing = library.decks.find(deck => deck.id === input.id)
  if (existing) {
    if (existing.name === input.name && existing.archetypeId === input.archetypeId && existing.deckList === input.deckList) return library
    throw new DeckError('This deck ID already exists.', 'REVISION_CONFLICT')
  }
  if (library.decks.length >= 500) throw new DeckError('Your library is full (500 lists).', 'VALIDATION_ERROR')
  return { ...library, revision: library.revision + 1, decks: [...library.decks, { ...input, revision: 1, createdAt: at, archivedAt: null }] }
}
export function changeCurrentDeck(library: DeckLibrary, deckId: string | null, expectedRevision: number, at: string): DeckLibrary {
  if (library.revision !== expectedRevision) throw new DeckError('Your deck library changed. Reload and try again.', 'REVISION_CONFLICT')
  if (deckId && !library.decks.some(deck => deck.id === deckId && !deck.archivedAt)) throw new DeckError('Choose an available saved list.', 'NOT_FOUND')
  if (library.currentDeckId === deckId) return library
  return { ...library, revision: library.revision + 1, currentDeckId: deckId, history: [...library.history, { at, deckId }] }
}
export function changeLibraryDeck(library: DeckLibrary, id: string, input: z.infer<typeof updateDeckSchema>, at: string): DeckLibrary {
  const deck = library.decks.find(deck => deck.id === id)
  if (!deck) throw new DeckError('Deck list not found.', 'NOT_FOUND')
  if (deck.revision !== input.expectedRevision) throw new DeckError('This list changed. Reload and try again.', 'REVISION_CONFLICT')
  const clear = input.archived && library.currentDeckId === id
  return { ...library, revision: library.revision + 1,
    decks: library.decks.map(deck => deck.id === id ? { ...deck, name: input.name ?? deck.name, archivedAt: input.archived ? deck.archivedAt ?? at : deck.archivedAt, revision: deck.revision + 1 } : deck),
    currentDeckId: clear ? null : library.currentDeckId,
    history: clear ? [...library.history, { at, deckId: null }] : library.history,
  }
}
export function resolveDeckAssignment(library: DeckLibrary, assignment: DeckAssignment, now = new Date().toISOString()) {
  if (assignment.mode === 'none') return { deckId: null, deckName: '', deckList: '' }
  let id: string | null
  if (assignment.mode === 'current') {
    if (Date.parse(assignment.capturedAt) > Date.parse(now) + 60_000) throw new DeckError('Capture time is in the future.', 'VALIDATION_ERROR')
    id = [...library.history].reverse().find(event => Date.parse(event.at) <= Date.parse(assignment.capturedAt))?.deckId ?? null
  } else id = assignment.deckId
  if (!id) return { deckId: null, deckName: '', deckList: '' }
  const deck = library.decks.find(deck => deck.id === id)
  if (!deck || (deck.archivedAt && (assignment.mode !== 'current' || Date.parse(assignment.capturedAt) >= Date.parse(deck.archivedAt)))) {
    throw new DeckError('This saved list is unavailable. Choose another list.', 'NOT_FOUND')
  }
  return { deckId: deck.id, deckName: deck.name, deckList: deck.deckList, userArchetype: deck.archetypeId }
}
