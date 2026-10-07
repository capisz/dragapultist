import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDeckSchema, createLibraryDeck, changeCurrentDeck, changeLibraryDeck, resolveDeckAssignment, emptyDeckLibrary, type CreateDeck } from '@/lib/deck-contract'
import { mutationDeckFields } from '@/lib/deck-game'
import { deckPersistence } from '@/lib/deck-persistence'
import { guestGamePersistence } from '@/lib/game-persistence'
import { matchesDeckList, UNCATEGORIZED } from '@/lib/deck-filters'
import { buildStatistics } from '@/components/statistics/statistics-utils'
import { assignDeckToGames } from '@/lib/deck-bulk'
import { gameDraftSchema } from '@/lib/game-contract'
import { analyzeGameLog } from '@/utils/game-analyzer'
import { readFileSync } from 'node:fs'

const ids = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003']
const input = (index = 0): CreateDeck => ({ id: ids[index], name: `Dragapult list ${index + 1}`, archetypeId: 'dragapult-dusknoir', deckList: `${4 + index} Dragapult ex\n${56 - index} Basic Psychic Energy` })
const at = (n: number) => `2026-10-07T10:00:0${n}.000Z`
const rawLog = readFileSync(new URL('./fixtures/desktop-complete-log.txt', import.meta.url), 'utf8')
const storage = new Map<string, string>()
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(at(9)))
  storage.clear()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
})

afterEach(() => vi.useRealTimers())

describe('saved list identity and history', () => {
  it('validates 60 cards and rejects unknown archetypes or malformed card input', () => {
    expect(createDeckSchema.parse(input()).deckList).toBe(input().deckList)
    expect(createDeckSchema.safeParse({ ...input(), deckList: '59 Psychic Energy' }).success).toBe(false)
    expect(createDeckSchema.safeParse({ ...input(), archetypeId: 'invented' }).success).toBe(false)
    expect(createDeckSchema.safeParse({ ...input(), deckList: '60 <script>alert(1)</script>' }).success).toBe(false)
  })
  it('freezes capture-time selection across switching, clearing and delayed retries', () => {
    let library = createLibraryDeck(emptyDeckLibrary(), input(), at(0))
    library = createLibraryDeck(library, input(1), at(0))
    library = changeCurrentDeck(library, ids[0], library.revision, at(1))
    library = changeCurrentDeck(library, ids[1], library.revision, at(3))
    library = changeCurrentDeck(library, null, library.revision, at(5))
    expect(resolveDeckAssignment(library, { mode: 'current', capturedAt: at(2) }).deckId).toBe(ids[0])
    expect(resolveDeckAssignment(library, { mode: 'current', capturedAt: at(4) }).deckId).toBe(ids[1])
    expect(resolveDeckAssignment(library, { mode: 'current', capturedAt: at(0) }).deckId).toBeNull()
    expect(resolveDeckAssignment(library, { mode: 'current', capturedAt: at(6) }).deckId).toBeNull()
    expect(resolveDeckAssignment(library, { mode: 'none' }).deckId).toBeNull()
    expect(() => resolveDeckAssignment(library, { mode: 'explicit', deckId: ids[2] })).toThrow(/unavailable/)
  })
  it('archives atomically and still resolves captures made before archiving', () => {
    let library = createLibraryDeck(emptyDeckLibrary(), input(), at(0))
    library = changeCurrentDeck(library, ids[0], library.revision, at(1))
    library = changeLibraryDeck(library, ids[0], { archived: true, expectedRevision: 1 }, at(4))
    expect(library.currentDeckId).toBeNull()
    expect(resolveDeckAssignment(library, { mode: 'current', capturedAt: at(3) }).deckId).toBe(ids[0])
    expect(resolveDeckAssignment(library, { mode: 'current', capturedAt: at(5) }).deckId).toBeNull()
    expect(() => resolveDeckAssignment(library, { mode: 'explicit', deckId: ids[0] })).toThrow()
    expect(mutationDeckFields(library, { deckId: ids[0], username: 'Player' }, { deckId: ids[0] }).deckId).toBe(ids[0])
  })
  it('retains immutable cards on rename and separates lists even when names match', () => {
    let library = createLibraryDeck(emptyDeckLibrary(), input(), at(0))
    library = changeLibraryDeck(library, ids[0], { name: 'League', expectedRevision: 1 }, at(1))
    library = createLibraryDeck(library, { ...input(1), name: 'League' }, at(2))
    expect(library.decks).toHaveLength(2)
    expect(library.decks[0].deckList).toBe(input().deckList)
    expect(mutationDeckFields(library, { deckId: ids[0], deckName: 'Original snapshot name' }, {}).deckName).toBe('Original snapshot name')
    expect(() => changeLibraryDeck(library, ids[0], { name: 'Stale', expectedRevision: 1 }, at(3))).toThrow(/changed/)
  })
  it('clears associations on perspective swaps and preserves uncategorized legacy snapshots during ordinary edits', () => {
    const library = createLibraryDeck(emptyDeckLibrary(), input(), at(0))
    expect(mutationDeckFields(library, { deckId: ids[0], username: 'Alice' }, { perspective: { username: 'Bob' } })).toEqual({ deckId: null, deckName: '', deckList: '' })
    expect(mutationDeckFields(library, { deckId: null, deckList: 'Legacy text' }, { deckId: null })).toEqual({ deckId: null })
  })
})

describe('guest persistence and per-list statistics', () => {
  it('saves/reloads a library and applies current, explicit and uncategorized imports without rewriting duplicates', async () => {
    const persistence = deckPersistence(false)
    let library = await persistence.create(input())
    library = await persistence.current(ids[0], library.revision)
    expect((await persistence.list()).currentDeckId).toBe(ids[0])
    const draft = gameDraftSchema.parse(analyzeGameLog(rawLog, false, undefined, undefined, null, null, 'PracticePlayer'))
    const capture = library.history.at(-1)!.at
    const created = await guestGamePersistence.create({ ...draft, id: 'capture', deckAssignment: { mode: 'current', capturedAt: capture } }, 'first')
    expect(created.game).toMatchObject({ deckId: ids[0], deckList: input().deckList, userArchetype: input().archetypeId })
    await persistence.current(null, library.revision)
    const duplicate = await guestGamePersistence.create({ ...draft, id: 'repeat', deckAssignment: { mode: 'none' } }, 'second')
    expect(duplicate.game.deckId).toBe(ids[0])
    expect(duplicate.duplicate).toBe(true)
    const updated = await guestGamePersistence.update(created.game.id, { notes: { 1: 'Keep this' } }, created.revision)
    expect(updated.game.deckId).toBe(ids[0])
    const cleared = await guestGamePersistence.update(created.game.id, { deckId: null }, updated.revision)
    expect(cleared.game).toMatchObject({ deckId: null, deckList: '', userArchetype: input().archetypeId })
    expect((await guestGamePersistence.get(created.game.id)).deckId).toBeNull()
  })
  it('agrees on totals for three lists and uncategorized games under one archetype', () => {
    const base = analyzeGameLog(rawLog, false, undefined, undefined, input().archetypeId, null, 'PracticePlayer')
    const games = [
      ...ids.flatMap((id, index) => [true, false].map((userWon, n) => ({ ...base, id: `${index}-${n}`, deckId: id, userWon }))),
      { ...base, id: 'unassigned', deckId: null, userWon: true },
    ]
    const all = buildStatistics(games)
    const lists = buildStatistics(games, { groupByList: true })
    expect(all.overall.totalGames).toBe(7)
    expect(all.decks).toHaveLength(1)
    expect(lists.decks).toHaveLength(4)
    for (const id of ids) {
      const filtered = games.filter(game => matchesDeckList(game, id))
      expect(filtered).toHaveLength(2)
      expect(lists.decks.find(deck => deck.deckId === id)).toMatchObject({ games: filtered.length, wins: 1, winRate: 50 })
    }
    expect(games.filter(game => matchesDeckList(game, UNCATEGORIZED))).toHaveLength(1)
    expect(lists.decks.find(deck => !deck.deckId)).toMatchObject({ games: 1, winRate: 100 })
  })
  it('reports partial bulk saves separately and stops after an account changes', async () => {
    const update = vi.fn(async (id: string) => {
      if (id === 'conflict') throw Object.assign(new Error('Changed'), { code: 'REVISION_CONFLICT' })
      if (id === 'failed') throw Error('Offline')
      return { game: { id }, revision: 2, saveState: 'saved' }
    })
    const persistence = { update } as unknown as import('@/lib/game-persistence').GamePersistence
    const result = await assignDeckToGames(persistence, ['saved', 'conflict', 'failed'].map(id => ({ id, revision: 1 })), ids[0])
    expect(result).toEqual({ saved: ['saved'], conflicted: ['conflict'], failed: ['failed'] })
    expect(update.mock.calls[0]).toEqual(['saved', { deckId: ids[0] }, 1])
    update.mockClear()
    expect(await assignDeckToGames(persistence, [{ id: 'other-account' }], ids[0], undefined, () => false)).toEqual({ saved: [], conflicted: [], failed: ['other-account'] })
    expect(update).not.toHaveBeenCalled()
  })
})
