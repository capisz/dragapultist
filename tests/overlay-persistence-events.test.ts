import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { prepareDesktopImport } from '@/lib/desktop-import'
import { remoteGamePersistence } from '@/lib/game-persistence'

const draft = prepareDesktopImport({ id: 'overlay-event-game', username: 'PracticePlayer', capturedAt: '2026-10-07T16:00:00Z', rawLog: readFileSync(new URL('./fixtures/desktop-complete-log.txt', import.meta.url), 'utf8') })
const saved = { game: { ...draft, revision: 1, schemaVersion: 2, parserVersion: 1 }, revision: 1, saveState: 'saved', duplicate: false }
let events: Event[]
beforeEach(() => {
  events = []
  vi.stubGlobal('window', { dispatchEvent: (event: Event) => { events.push(event); return true } })
})
afterEach(() => vi.unstubAllGlobals())

function server(result: Response) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url === '/api/auth/session' ? Response.json({ csrfToken: 'token' }) : result))
}

describe('overlay persistence notifications', () => {
  it('reports successful server acknowledgement with the canonical ID, including duplicates', async () => {
    server(Response.json({ ...saved, duplicate: true }))
    await remoteGamePersistence.create(draft, 'stable-key')
    expect(events.map(event => event.type)).toEqual(['dragapultist-game-imported', 'dragapultist-games-changed'])
    expect((events[0] as CustomEvent).detail).toEqual({ id: draft.id, duplicate: true })
    expect(JSON.stringify((events[0] as CustomEvent).detail)).not.toContain(draft.rawLog)
  })
  it('never announces a saved import for a network/server or malformed-success failure', async () => {
    for (const response of [new Response('offline', { status: 503 }), Response.json({ saveState: 'saved' })]) {
      server(response)
      await expect(remoteGamePersistence.create(draft, 'stable-key')).rejects.toThrow()
      expect(events).toHaveLength(0)
    }
  })
  it('refreshes stats after acknowledged edits and deletions without announcing another import', async () => {
    server(Response.json(saved))
    await remoteGamePersistence.update(draft.id, { favorite: true }, 1)
    expect(events.map(event => event.type)).toEqual(['dragapultist-games-changed'])
    events.length = 0
    server(new Response(null, { status: 204 }))
    await remoteGamePersistence.remove(draft.id, 1)
    expect(events.map(event => event.type)).toEqual(['dragapultist-games-changed'])
  })
})
