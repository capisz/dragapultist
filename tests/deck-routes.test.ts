import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ owner: 'user-a' as string | null, docs: new Map<string, any>() }))
vi.mock('@/lib/request-user', () => ({ getRequestIdentity: async () => state.owner ? { userId: state.owner, status: 'authenticated' } : { userId: null, status: 'missing' } }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => name === 'dragapultist_csrf' ? { value: 'test-csrf-token-value-long' } : undefined }) }))
vi.mock('@/lib/mongodb', () => ({ default: Promise.resolve({ db: () => ({ collection: () => ({
  findOne: async ({ _id }: { _id: string }) => state.docs.has(_id) ? structuredClone(state.docs.get(_id)) : null,
  insertOne: async (doc: any) => { if (state.docs.has(doc._id)) throw Object.assign(Error('Duplicate'), { code: 11000 }); state.docs.set(doc._id, structuredClone(doc)); return { insertedId: doc._id } },
  replaceOne: async (filter: any, doc: any) => { const before = state.docs.get(filter._id); if (!before || before.revision !== filter.revision) return { matchedCount: 0 }; state.docs.set(filter._id, { _id: filter._id, ...structuredClone(doc) }); return { matchedCount: 1 } },
}) }) }) }))
import { GET, POST } from '@/app/api/decks/route'
import { PATCH as update } from '@/app/api/decks/[id]/route'
import { PATCH as current } from '@/app/api/decks/current/route'
const id = '00000000-0000-4000-8000-000000000001'
const input = { id, name: 'League list', archetypeId: 'dragapult-dusknoir', deckList: '4 Dragapult ex\n56 Basic Psychic Energy' }
function request(method = 'GET', body?: unknown, expectedOwner?: string) {
  return new Request('http://localhost:3000/api/decks', { method, headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', 'X-CSRF-Token': 'test-csrf-token-value-long', ...(expectedOwner ? { 'X-Expected-Owner': expectedOwner } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
}
const context = { params: Promise.resolve({ id }) }
beforeEach(() => { state.owner = 'user-a'; state.docs.clear() })
describe('owner-scoped saved deck routes', () => {
  it('creates idempotently, reloads, and never exposes another account’s library', async () => {
    expect((await POST(request('POST', input))).status).toBe(200)
    expect((await POST(request('POST', input))).status).toBe(200)
    const library = await (await GET(request())).json()
    expect(library.decks).toHaveLength(1)
    expect(library.decks[0]).toMatchObject(input)
    expect(library).not.toHaveProperty('_id')
    state.owner = 'user-b'
    expect((await (await GET(request())).json()).decks).toEqual([])
    expect((await current(request('PATCH', { deckId: id, expectedRevision: 0 }))).status).toBe(404)
    expect((await update(request('PATCH', { name: 'Stolen', expectedRevision: 1 }), context)).status).toBe(404)
  })
  it('protects revisions, rejects card edits, and archives the current deck atomically', async () => {
    await POST(request('POST', input))
    expect((await current(request('PATCH', { deckId: id, expectedRevision: 1 }))).status).toBe(200)
    expect((await current(request('PATCH', { deckId: null, expectedRevision: 1 }))).status).toBe(409)
    expect((await update(request('PATCH', { name: 'Renamed', expectedRevision: 1 }), context)).status).toBe(200)
    expect((await update(request('PATCH', { name: 'Stale', expectedRevision: 1 }), context)).status).toBe(409)
    expect((await update(request('PATCH', { deckList: '60 Changed Cards', expectedRevision: 2 }), context)).status).toBe(400)
    const response = await update(request('PATCH', { archived: true, expectedRevision: 2 }), context)
    const archived = await response.json()
    expect(archived.currentDeckId).toBeNull()
    expect(archived.history.at(-1).deckId).toBeNull()
    expect(archived.decks[0].deckList).toBe(input.deckList)
  })
  it('rejects unsafe origins, unsigned users, malformed lists, and account changes', async () => {
    const badOrigin = request('POST', input); badOrigin.headers.set('Origin', 'https://untrusted.example')
    expect((await POST(badOrigin)).status).toBe(403)
    expect((await POST(request('POST', { ...input, deckList: '59 Psychic Energy' }))).status).toBe(400)
    expect((await POST(request('POST', input, 'user-b'))).status).toBe(401)
    state.owner = null
    expect((await GET(request())).status).toBe(401)
    expect((await POST(request('POST', input))).status).toBe(401)
  })
  it('retains concurrent list creations without losing either write', async () => {
    const responses = await Promise.all([POST(request('POST', input)), POST(request('POST', { ...input, id: '00000000-0000-4000-8000-000000000002', name: 'Second list' }))])
    expect(responses.map(response => response.status)).toEqual([200, 200])
    expect((await (await GET(request())).json()).decks).toHaveLength(2)
  })
})
