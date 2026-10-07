'use client'
import { changeCurrentDeck, changeLibraryDeck, createDeckSchema, createLibraryDeck, deckLibrarySchema, emptyDeckLibrary, type DeckLibrary, type CreateDeck } from '@/lib/deck-contract'
import { checkedJson, mutation } from '@/lib/game-persistence'

const KEY = 'dragapultist-guest-deck-library-v1'
export function readGuestDeckLibrary(): DeckLibrary {
  const raw = localStorage.getItem(KEY)
  return raw ? deckLibrarySchema.parse(JSON.parse(raw)) : emptyDeckLibrary()
}
function saveGuest(library: DeckLibrary) { localStorage.setItem(KEY, JSON.stringify(library)); return library }
function nextAt(library: DeckLibrary) { return new Date(Math.max(Date.now(), Date.parse(library.history.at(-1)?.at ?? '') + 1 || 0)).toISOString() }
export function deckPersistence(remote: boolean, owner?: string) {
  return {
    async list(signal?: AbortSignal) {
      return remote ? deckLibrarySchema.parse(await checkedJson(await fetch('/api/decks', { cache: 'no-store', signal }))) : readGuestDeckLibrary()
    },
    async create(input: CreateDeck) {
      const parsed = createDeckSchema.parse(input)
      if (remote) return deckLibrarySchema.parse(await checkedJson(await mutation('/api/decks', 'POST', parsed, undefined, owner)))
      const library = readGuestDeckLibrary()
      return saveGuest(createLibraryDeck(library, parsed, nextAt(library)))
    },
    async update(id: string, changes: { name?: string; archived?: true; expectedRevision: number }) {
      if (remote) return deckLibrarySchema.parse(await checkedJson(await mutation(`/api/decks/${encodeURIComponent(id)}`, 'PATCH', changes, undefined, owner)))
      const library = readGuestDeckLibrary()
      return saveGuest(changeLibraryDeck(library, id, changes, nextAt(library)))
    },
    async current(deckId: string | null, expectedRevision: number) {
      if (remote) return deckLibrarySchema.parse(await checkedJson(await mutation('/api/decks/current', 'PATCH', { deckId, expectedRevision }, undefined, owner)))
      const library = readGuestDeckLibrary()
      return saveGuest(changeCurrentDeck(library, deckId, expectedRevision, nextAt(library)))
    },
  }
}
