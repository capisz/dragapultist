const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadSettings, patchSettings, readStatistics, summarize, recordedDay, localDay, overlayBounds, visibleFor } = require('../overlay-model.cjs')
const payload = () => ({ truncated: false, model: {
  decks: [{ key: 'dragapult', label: 'Dragapult', wins: 2, losses: 1, games: 3, winRate: 99 }, { key: 'gardevoir', label: 'Gardevoir', wins: 0, losses: 1, games: 1 }],
  games: [
    { id: 'old', opponent: 'A', userWon: true, timestamp: 1, recordedDate: '10/6/2026', userArchetypeId: 'dragapult' },
    { id: 'latest', opponent: 'B', userWon: false, timestamp: 4, recordedDate: '10/7/2026', userArchetypeId: 'gardevoir' },
    { id: 'today', opponent: 'C', userWon: false, timestamp: 3, recordedDate: '2026-10-07', userArchetypeId: 'dragapult' },
    { id: 'historical', opponent: 'D', userWon: true, timestamp: 2, recordedDate: '1/1/2020', userArchetypeId: 'dragapult' },
  ],
} })

test('follows latest saved game, supports an override, and keeps today independent of save dates', () => {
  const model = readStatistics(payload()), now = new Date(2026, 9, 7, 13)
  const automatic = summarize(model, null, now)
  assert.equal(automatic.deck.key, 'gardevoir')
  assert.deepEqual(automatic.recent.map(g => g.id), ['latest', 'today', 'historical', 'old'])
  assert.equal(automatic.today.games, 2)
  assert.equal(automatic.today.losses, 2)
  const override = summarize(model, 'dragapult', now)
  assert.equal(override.deck.winRate, 2 / 3 * 100)
  assert.equal(override.today.losses, 2)
  assert.equal(summarize(model, 'deleted-deck', now).selectionMissing, true)
})
test('calendar dates survive timezone changes; ISO instants use the local day, invalid dates are excluded', () => {
  assert.equal(recordedDay('10/7/2026'), '2026-10-07')
  assert.equal(recordedDay('2026-10-07'), '2026-10-07')
  assert.equal(recordedDay('2026-10-07T00:30:00Z'), localDay(new Date('2026-10-07T00:30:00Z')))
  assert.equal(recordedDay('2/30/2026'), null)
  assert.equal(recordedDay('unknown'), null)
  assert.equal(recordedDay('2026-02-29'), null)
  const model = readStatistics(payload())
  assert.equal(summarize(model, null, new Date(2026, 9, 8)).today.games, 0)
  model.games[0].recordedDate = ''
  assert.equal(summarize(model).today.incomplete, true)
})
test('empty, capped and unknown-deck statistics remain truthful and recent history is limited to five', () => {
  assert.equal(summarize(null).deck, null)
  assert.equal(summarize(null).recent.length, 0)
  const raw = payload(); raw.truncated = true
  for (let i = 0; i < 10; i++) raw.model.games.push({ ...raw.model.games[0], id: `extra-${i}`, timestamp: 5 + i, userArchetypeId: null })
  const state = summarize(readStatistics(raw))
  assert.equal(state.recent.length, 5)
  assert.equal(state.deck, null)
  assert.equal(state.truncated, true)
  assert.equal(state.recent[0].deck, 'Unknown deck')
})
test('statistics are bounded, reject malformed results, and strip raw logs and other private fields', () => {
  const raw = payload(); raw.model.games[0].rawLog = 'private'; raw.model.games[0].notes = { 1: 'private' }
  const model = readStatistics(raw)
  assert.equal(JSON.stringify(model).includes('private'), false)
  raw.model.games[0].userWon = 'yes'
  assert.throws(() => readStatistics(raw))
  const duplicate = payload(); duplicate.model.games.push(duplicate.model.games[0])
  assert.throws(() => readStatistics(duplicate))
  const invalid = payload(); invalid.model.decks[0].wins = 4
  assert.throws(() => readStatistics(invalid))
  assert.throws(() => readStatistics({ model: { games: Array(5001), decks: [] }, truncated: true }))
})
test('disabled defaults, per-account selections, restart settings and shortcut validation', () => {
  const defaults = loadSettings()
  assert.equal(defaults.enabled, false)
  const configured = patchSettings(defaults, { enabled: true, selectedDeckKey: 'dragapult', position: { x: -20, y: 30 } }, 'alice', payload().model.decks)
  const restored = loadSettings(JSON.parse(JSON.stringify(configured)))
  assert.equal(restored.selections.alice, 'dragapult')
  assert.equal(restored.selections.bob, undefined)
  assert.deepEqual(restored.position, { x: -20, y: 30 })
  assert.equal(patchSettings(restored, { selectedDeckKey: null }, 'alice').selections.alice, undefined)
  assert.throws(() => patchSettings(defaults, { selectedDeckKey: 'dragapult' }, null, payload().model.decks))
  assert.throws(() => patchSettings(defaults, { selectedDeckKey: 'invalid' }, 'alice', payload().model.decks))
  assert.throws(() => patchSettings(defaults, { visibilityShortcut: 'O' }))
  assert.throws(() => patchSettings(defaults, { interactionShortcut: defaults.visibilityShortcut }))
  assert.throws(() => patchSettings(defaults, { script: 'no' }))
})
test('focus state hides on unrelated apps, detection failure and disable, while preserving intentional interaction', () => {
  const base = { enabled: true, hidden: false, active: true, game: true, interactive: false, overlayFocused: false }
  assert.equal(visibleFor(base), true)
  assert.equal(visibleFor({ ...base, game: false }), false)
  assert.equal(visibleFor({ ...base, game: false, interactive: true, overlayFocused: true }), true)
  assert.equal(visibleFor({ ...base, active: false, interactive: true, overlayFocused: true }), false)
  assert.equal(visibleFor({ ...base, enabled: false }), false)
  assert.equal(visibleFor({ ...base, hidden: true }), false)
})
test('idle opacity persists through restart, supports invisibility, and rejects corrupt or untrusted values', () => {
  assert.equal(loadSettings().idleOpacity, 0.35)
  const saved = patchSettings(loadSettings(), { idleOpacity: 0.6 })
  assert.equal(loadSettings(JSON.parse(JSON.stringify(saved))).idleOpacity, 0.6)
  assert.equal(patchSettings(saved, { idleOpacity: 0 }).idleOpacity, 0)
  assert.equal(patchSettings(saved, { idleOpacity: 1 }).idleOpacity, 1)
  for (const value of [-0.1, 1.1, NaN, Infinity, '0.5', null]) {
    assert.equal(loadSettings({ idleOpacity: value }).idleOpacity, 0.35)
    assert.throws(() => patchSettings(saved, { idleOpacity: value }), /opacity/)
  }
})
test('positions follow the game across displays and stay inside work areas after resolution changes', () => {
  assert.deepEqual(overlayBounds({ x: 100, y: 50, width: 1280, height: 800 }, { x: 0, y: 0, width: 1920, height: 1080 }, null), { x: 1044, y: 66, width: 320, height: 360 })
  assert.deepEqual(overlayBounds({ x: -1400, y: 0, width: 1200, height: 900 }, { x: -1440, y: 0, width: 1440, height: 900 }, { x: 5000, y: -20 }), { x: -320, y: 0, width: 320, height: 360 })
  const small = overlayBounds({ x: 0, y: 0, width: 200, height: 200 }, { x: 0, y: 0, width: 200, height: 200 }, null)
  assert.deepEqual(small, { x: 0, y: 0, width: 200, height: 200 })
})
