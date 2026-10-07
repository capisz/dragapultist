const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  idleOpacity: 0.35,
  visibilityShortcut: 'CommandOrControl+Shift+O',
  interactionShortcut: 'CommandOrControl+Shift+I',
  position: null,
  selections: {},
})
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value, max = 120) => typeof value === 'string' && value.length > 0 && value.length <= max
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 5000
const opacity = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
const accelerator = value => typeof value === 'string' && value.length <= 80 && /^(?:(?:CommandOrControl|CmdOrCtrl|Command|Cmd|Control|Ctrl|Alt|Option|Shift|Super)\+)+(?:[A-Za-z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/.test(value)

function loadSettings(value) {
  const source = record(value) ? value : {}
  const selections = Object.create(null)
  if (record(source.selections)) {
    for (const [owner, key] of Object.entries(source.selections).slice(-50)) {
      if (text(owner, 128) && text(key)) selections[owner] = key
    }
  }
  return {
    ...DEFAULT_SETTINGS,
    enabled: source.enabled === true,
    idleOpacity: opacity(source.idleOpacity) ? source.idleOpacity : DEFAULT_SETTINGS.idleOpacity,
    visibilityShortcut: accelerator(source.visibilityShortcut) ? source.visibilityShortcut : DEFAULT_SETTINGS.visibilityShortcut,
    interactionShortcut: accelerator(source.interactionShortcut) ? source.interactionShortcut : DEFAULT_SETTINGS.interactionShortcut,
    position: record(source.position) && [source.position.x, source.position.y].every(n => Number.isFinite(n) && Math.abs(n) <= 100000)
      ? { x: source.position.x, y: source.position.y } : null,
    selections,
  }
}

function patchSettings(settings, patch, accountId, decks = []) {
  if (!record(patch) || Object.keys(patch).some(k => !['enabled', 'idleOpacity', 'visibilityShortcut', 'interactionShortcut', 'selectedDeckKey', 'position'].includes(k))) throw Error('Invalid overlay setting.')
  const next = loadSettings(settings)
  if (Object.hasOwn(patch, 'enabled')) {
    if (typeof patch.enabled !== 'boolean') throw Error('Invalid overlay setting.')
    next.enabled = patch.enabled
  }
  if (Object.hasOwn(patch, 'idleOpacity')) {
    if (!opacity(patch.idleOpacity)) throw Error('Choose an opacity between 0% and 100%.')
    next.idleOpacity = patch.idleOpacity
  }
  for (const key of ['visibilityShortcut', 'interactionShortcut']) {
    if (!Object.hasOwn(patch, key)) continue
    if (!accelerator(patch[key])) throw Error('Use a shortcut such as CommandOrControl+Shift+O.')
    next[key] = patch[key]
  }
  if (next.visibilityShortcut.toLowerCase() === next.interactionShortcut.toLowerCase()) throw Error('Choose different visibility and interaction shortcuts.')
  if (Object.hasOwn(patch, 'selectedDeckKey')) {
    if (!accountId) throw Error('Sign in before choosing a deck.')
    if (patch.selectedDeckKey === null) delete next.selections[accountId]
    else {
      if (!text(patch.selectedDeckKey) || !decks.some(d => d.key === patch.selectedDeckKey)) throw Error('Choose a deck from your saved games.')
      next.selections[accountId] = patch.selectedDeckKey
    }
  }
  if (Object.hasOwn(patch, 'position')) {
    if (patch.position === null) next.position = null
    else if (record(patch.position) && [patch.position.x, patch.position.y].every(n => Number.isFinite(n) && Math.abs(n) <= 100000)) next.position = { x: Math.round(patch.position.x), y: Math.round(patch.position.y) }
    else throw Error('Invalid overlay position.')
  }
  return next
}

// Copy only the bounded fields the overlay needs. No raw logs, notes, or decklists.
function readStatistics(payload) {
  if (!record(payload) || !record(payload.model) || !Array.isArray(payload.model.games) || !Array.isArray(payload.model.decks) || payload.model.games.length > 5000 || payload.model.decks.length > 5000 || typeof payload.truncated !== 'boolean') throw Error('Overlay statistics need the compatible website update.')
  const decks = payload.model.decks.map(d => {
    if (!record(d) || !text(d.key) || !text(d.label) || ![d.games, d.wins, d.losses].every(count) || d.wins + d.losses !== d.games) throw Error('Invalid deck statistics.')
    return { key: d.key, label: d.label, games: d.games, wins: d.wins, losses: d.losses, winRate: d.games ? d.wins / d.games * 100 : 0 }
  })
  const ids = new Set()
  const games = payload.model.games.map(g => {
    if (!record(g) || !text(g.id, 128) || ids.has(g.id) || !text(g.opponent, 80) || typeof g.userWon !== 'boolean' || !Number.isFinite(g.timestamp) || g.timestamp < 0 || (g.userArchetypeId !== null && !text(g.userArchetypeId)) || (g.recordedDate !== undefined && (typeof g.recordedDate !== 'string' || g.recordedDate.length > 64))) throw Error('Invalid game statistics.')
    ids.add(g.id)
    return { id: g.id, opponent: g.opponent, userWon: g.userWon, timestamp: g.timestamp, recordedDate: g.recordedDate || '', deckKey: g.userArchetypeId || '__unknown__' }
  }).sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id))
  return { games, decks, truncated: payload.truncated }
}

const localDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
function recordedDay(value) {
  if (typeof value !== 'string') return null
  let year, month, day
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
  if (iso) [, year, month, day] = iso.map(Number)
  else if (us) [, month, day, year] = us.map(Number)
  else if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? localDay(date) : null
  } else return null
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return localDay(date)
}

function summarize(model, selectedDeckKey, now = new Date()) {
  const games = model?.games || [], decks = model?.decks || []
  const key = selectedDeckKey || games[0]?.deckKey || null
  const today = games.filter(g => recordedDay(g.recordedDate) === localDay(now))
  const wins = today.filter(g => g.userWon).length
  return {
    deck: decks.find(d => d.key === key) || null,
    decks,
    selectedDeckKey: selectedDeckKey || null,
    selectionMissing: !!selectedDeckKey && !decks.some(d => d.key === selectedDeckKey),
    today: { wins, losses: today.length - wins, games: today.length, day: localDay(now), incomplete: games.some(g => !recordedDay(g.recordedDate)) },
    recent: games.slice(0, 5).map(g => ({ id: g.id, opponent: g.opponent, won: g.userWon, deck: decks.find(d => d.key === g.deckKey)?.label || 'Unknown deck' })),
    truncated: model?.truncated || false,
  }
}

function overlayBounds(game, workArea, position, size = { width: 320, height: 360 }) {
  const width = Math.min(size.width, workArea.width), height = Math.min(size.height, workArea.height)
  const x = position ? game.x + position.x : game.x + game.width - width - 16
  const y = position ? game.y + position.y : game.y + 16
  return { x: Math.round(Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width))), y: Math.round(Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height))), width, height }
}

function visibleFor({ enabled, hidden, active, game, interactive, overlayFocused }) {
  return !!(enabled && !hidden && active && (game || (interactive && overlayFocused)))
}

module.exports = { DEFAULT_SETTINGS, loadSettings, patchSettings, readStatistics, summarize, localDay, recordedDay, overlayBounds, visibleFor }
