const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { GameOverlay } = require('../overlay.cjs')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
const stats = { truncated: false, model: { games: [{ id: 'one', opponent: 'Opponent', userWon: true, timestamp: 1, recordedDate: '10/7/2026', userArchetypeId: 'dragapult' }], decks: [{ key: 'dragapult', label: 'Dragapult', games: 1, wins: 1, losses: 0 }] } }

function setup(t, settings) {
  const handlers = new Map(), shortcuts = new Map(), saved = []
  let focus = { active: true, game: true, bounds: { x: 0, y: 0, width: 1280, height: 800 } }
  class Window extends EventEmitter {
    constructor(options) { super(); this.options = options; this.visible = false; this.focused = false; this.bounds = { x: 0, y: 0, width: 320, height: 360 }; this.sent = []; this.webContents = new EventEmitter(); this.webContents.session = { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} }; this.webContents.setWindowOpenHandler = fn => { this.openHandler = fn }; this.webContents.send = (...args) => this.sent.push(args) }
    setIgnoreMouseEvents(value) { this.ignoreMouse = value }
    setOpacity(value) { this.opacity = value }
    setAlwaysOnTop() {}
    setVisibleOnAllWorkspaces() {}
    setFocusable(value) { this.focusable = value }
    async loadFile() { this.webContents.emit('did-finish-load') }
    isDestroyed() { return !!this.destroyed }
    isFocused() { return this.focused }
    isVisible() { return this.visible }
    getBounds() { return this.bounds }
    setBounds(bounds) { this.bounds = bounds; this.emit('move') }
    showInactive() { this.visible = true }
    show() { this.visible = true; this.focused = true }
    focus() { this.focused = true }
    blur() { this.focused = false }
    hide() { this.visible = false }
    destroy() { this.destroyed = true }
  }
  const deps = {
    BrowserWindow: Window, settings,
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), removeHandler: name => handlers.delete(name) },
    screen: { getCursorScreenPoint: () => ({ x: -5000, y: -5000 }), getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }) },
    globalShortcut: { register: (key, callback) => { if (key.endsWith('+X')) return false; shortcuts.set(key, callback); return true }, unregister: key => shortcuts.delete(key) },
    readFocus: async () => { if (focus instanceof Error) throw focus; return focus },
    readStats: async () => stats,
    saveSettings: async value => saved.push(structuredClone(value)),
  }
  const overlay = new GameOverlay(deps)
  t.after(() => overlay.stop())
  const settle = () => new Promise(resolve => setImmediate(resolve))
  return { overlay, deps, handlers, shortcuts, saved, settle, setFocus: value => { focus = value } }
}

test('enable creates a separate sandboxed, unfocused click-through window; disable and quit clean up', async t => {
  const f = setup(t)
  f.overlay.start()
  assert.equal(f.overlay.window, null)
  await f.overlay.configure({ enabled: true }); await f.settle()
  await f.overlay.poll()
  const w = f.overlay.window
  assert.equal(w.options.webPreferences.sandbox, true)
  assert.equal(w.options.webPreferences.nodeIntegration, false)
  assert.equal(w.options.webPreferences.partition, 'dragapultist-overlay')
  assert.equal(w.focused, false)
  assert.equal(w.ignoreMouse, true)
  assert.equal(w.visible, true)
  assert.equal(f.shortcuts.size, 2)
  assert.deepEqual(w.openHandler({ url: 'https://other.example' }), { action: 'deny' })
  await f.overlay.configure({ enabled: false })
  assert.equal(w.visible, false)
  assert.equal(f.shortcuts.size, 0)
  f.overlay.stop()
  assert.equal(w.destroyed, true)
})
test('focus transitions preserve interaction, then lock and hide on unrelated focus or detection failure', async t => {
  const f = setup(t)
  await f.overlay.configure({ enabled: true }); await f.settle(); await f.overlay.poll()
  f.overlay.toggleInteraction()
  assert.equal(f.overlay.window.ignoreMouse, false)
  f.setFocus({ active: true, game: false, bounds: null }); await f.overlay.poll()
  assert.equal(f.overlay.window.visible, true)
  f.overlay.window.focused = false; await f.overlay.poll()
  assert.equal(f.overlay.window.visible, false)
  assert.equal(f.overlay.interactive, false)
  f.setFocus(Error('native detector failed')); await f.overlay.poll()
  assert.match(f.overlay.error, /detection is unavailable/)
})
test('unavailable shortcuts keep tray-equivalent controls usable and can be changed', async t => {
  const f = setup(t)
  await f.overlay.configure({ enabled: true, visibilityShortcut: 'Control+Shift+X' }); await f.settle()
  assert.equal(f.overlay.shortcutErrors.length, 1)
  assert.equal(f.shortcuts.size, 1)
  await f.overlay.configure({ visibilityShortcut: 'Control+Shift+P' })
  assert.equal(f.overlay.shortcutErrors.length, 0)
  assert.equal(f.shortcuts.size, 2)
  f.overlay.toggleVisibility(false)
  assert.equal(f.overlay.window.visible, false)
  f.overlay.toggleVisibility(true); await f.settle()
  assert.equal(f.overlay.window.visible, true)
})
test('sign-out and account changes clear stats, notices and overrides without accepting stale responses', async t => {
  const f = setup(t)
  await f.overlay.configure({ enabled: true }); await f.settle()
  f.overlay.setAccount('alice'); await f.settle()
  await f.overlay.configure({ selectedDeckKey: 'dragapult' })
  f.overlay.notice('saved', 'one', 'alice')
  assert.equal(f.overlay.state().notice.message, 'Game imported')
  f.overlay.setAccount(null)
  assert.equal(f.overlay.state().deck, null)
  assert.equal(f.overlay.state().notice, null)
  let finish
  f.deps.readStats = () => new Promise(resolve => { finish = resolve })
  await f.settle()
  f.overlay.setAccount('alice'); await f.settle()
  f.overlay.setAccount('bob')
  finish(stats); await f.settle()
  assert.equal(f.overlay.model, null)
  assert.equal(f.overlay.status().selectedDeckKey, null)
  f.overlay.setAccount('alice')
  assert.equal(f.overlay.status().selectedDeckKey, 'dragapult')
})
test('queued, acknowledged, duplicate, failed and review notices are distinct and never shown for another account', async t => {
  const f = setup(t)
  await f.overlay.configure({ enabled: true }); await f.settle()
  f.overlay.setAccount('alice'); await f.settle()
  f.overlay.notice('saved', 'one', 'bob')
  assert.equal(f.overlay.state().notice, null)
  for (const kind of ['queued', 'saved', 'duplicate', 'failed', 'review']) {
    f.overlay.notice(kind, 'one', 'alice')
    assert.equal(f.overlay.state().notice.kind, kind)
  }
  f.overlay.notice('saved', 'one', 'alice')
  assert.equal(f.overlay.state().notice.kind, 'review')
})
test('local IPC rejects website senders, subframes and unknown operations', async t => {
  const f = setup(t)
  await f.overlay.configure({ enabled: true }); await f.settle()
  const handler = f.handlers.get('overlay:request')
  await assert.rejects(handler({ sender: {} }, { version: 1, method: 'state' }), /Untrusted/)
  const wc = f.overlay.window.webContents
  wc.mainFrame = { url: pathToFileURL(path.join(__dirname, '..', 'overlay.html')).href }
  const trusted = { sender: wc, senderFrame: wc.mainFrame }
  assert.equal((await handler(trusted, { version: 1, method: 'state' })).enabled, true)
  await assert.rejects(handler({ ...trusted, senderFrame: { ...wc.mainFrame } }, { version: 1, method: 'state' }), /Untrusted/)
  await assert.rejects(handler(trusted, { version: 1, method: 'inspect' }), /Unknown/)
  await handler(trusted, { version: 1, method: 'lock' })
  assert.equal(f.overlay.interactive, false)
  await handler(trusted, { version: 1, method: 'resize', value: 480 })
  assert.equal(f.overlay.window.getBounds().height, 480)
  await assert.rejects(handler(trusted, { version: 1, method: 'resize', value: 10000 }), /Invalid/)
})

test('only intentional return from interaction restores game focus; automatic hiding never steals focus', async t => {
  const f = setup(t)
  let returns = 0
  f.deps.returnGameFocus = async () => { returns++ }
  await f.overlay.configure({ enabled: true }); await f.settle(); await f.overlay.poll()
  f.overlay.toggleInteraction(); f.overlay.lock()
  assert.equal(returns, 1)
  f.overlay.toggleInteraction(); f.overlay.hide()
  assert.equal(returns, 1)
})

test('failed persistence retains previous settings, and a late focus result cannot reshow a disabled overlay', async t => {
  const f = setup(t)
  f.deps.saveSettings = async () => { throw Error('disk full') }
  await assert.rejects(f.overlay.configure({ enabled: true }), /disk full/)
  assert.equal(f.overlay.settings.enabled, false)
  f.deps.saveSettings = async () => {}
  await f.overlay.configure({ enabled: true }); await f.settle()
  let finish
  f.deps.readFocus = () => new Promise(resolve => { finish = resolve })
  const pending = f.overlay.poll()
  await f.overlay.configure({ enabled: false })
  finish({ active: true, game: true, bounds: { x: 0, y: 0, width: 1280, height: 800 } })
  await pending
  assert.equal(f.overlay.window.isVisible(), false)
})

test('tray interaction remains usable after the tray menu temporarily takes game focus', async t => {
  const f = setup(t)
  await f.overlay.configure({ enabled: true }); await f.settle(); await f.overlay.poll()
  f.setFocus({ active: true, game: false, bounds: null }); await f.overlay.poll()
  assert.equal(f.overlay.window.isVisible(), false)
  f.deps.returnGameFocus = async () => f.setFocus({ active: true, game: true, bounds: { x: 0, y: 0, width: 1280, height: 800 } })
  await f.overlay.interactFromTray()
  assert.equal(f.overlay.window.isVisible(), true)
  assert.equal(f.overlay.interactive, true)
  assert.equal(f.overlay.window.ignoreMouse, false)
})

test('tray recovery waits for an in-flight stale focus read and then polls the restored game', async t => {
  const f = setup(t)
  await f.overlay.configure({ enabled: true }); await f.settle(); await f.overlay.poll()
  f.overlay.hide()
  let finish
  f.deps.readFocus = () => new Promise(resolve => { finish = resolve })
  const pending = f.overlay.poll()
  f.deps.returnGameFocus = async () => { f.deps.readFocus = async () => ({ active: true, game: true, bounds: { x: 0, y: 0, width: 1280, height: 800 } }) }
  const interaction = f.overlay.interactFromTray()
  await f.settle()
  finish({ active: true, game: false, bounds: null })
  await pending; await interaction
  assert.equal(f.overlay.interactive, true)
  assert.equal(f.overlay.window.isVisible(), true)
})

test('hover reveals a fully transparent click-through panel without stealing focus, including negative display coordinates', async t => {
  const f = setup(t)
  f.setFocus({ active: true, game: true, bounds: { x: -1800, y: 0, width: 1280, height: 800 } })
  f.deps.screen.getDisplayMatching = () => ({ workArea: { x: -1920, y: 0, width: 1920, height: 1080 } })
  await f.overlay.configure({ enabled: true, idleOpacity: 0 }); await f.settle(); await f.overlay.poll()
  const w = f.overlay.window, bounds = w.getBounds()
  assert.equal(w.opacity, 0)
  f.deps.screen.getCursorScreenPoint = () => ({ x: bounds.x + 20, y: bounds.y + 20 })
  f.overlay.updateOpacity()
  assert.equal(w.opacity, 1)
  assert.equal(w.ignoreMouse, true)
  assert.equal(w.focused, false)
  f.deps.screen.getCursorScreenPoint = () => ({ x: bounds.x + bounds.width, y: bounds.y })
  f.overlay.updateOpacity()
  assert.equal(w.opacity, 0)
  f.overlay.toggleInteraction()
  assert.equal(w.opacity, 1)
  f.overlay.lock()
  assert.equal(w.opacity, 0)
  await f.overlay.configure({ idleOpacity: 0.65 })
  assert.equal(w.opacity, 0.65)
  assert.equal(f.saved.at(-1).idleOpacity, 0.65)
  f.deps.screen.getCursorScreenPoint = () => { throw Error('cursor unavailable') }
  f.overlay.updateOpacity()
  assert.equal(w.opacity, 1)
})

test('import notices reveal the panel for four seconds and restore idle opacity only after notice and hover end', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.now() })
  const f = setup(t)
  await f.overlay.configure({ enabled: true, idleOpacity: 0.2 }); await f.settle(); await f.overlay.poll()
  f.overlay.setAccount('alice'); await f.settle()
  const w = f.overlay.window
  for (const kind of ['queued', 'saved', 'duplicate', 'review', 'failed']) {
    f.overlay.notice(kind, kind, 'alice')
    assert.equal(w.opacity, 1)
    assert.equal(w.ignoreMouse, true)
    assert.equal(w.focused, false)
    t.mock.timers.tick(3999); f.overlay.updateOpacity()
    assert.equal(w.opacity, 1)
    t.mock.timers.tick(1)
    assert.equal(w.opacity, 0.2)
  }
  f.overlay.notice('saved', 'hovering', 'alice')
  const bounds = w.getBounds()
  f.deps.screen.getCursorScreenPoint = () => ({ x: bounds.x + 1, y: bounds.y + 1 })
  t.mock.timers.tick(4000)
  assert.equal(w.opacity, 1)
  f.deps.screen.getCursorScreenPoint = () => ({ x: -5000, y: -5000 })
  f.overlay.updateOpacity()
  assert.equal(w.opacity, 0.2)
  f.overlay.notice('saved', 'hovering', 'alice')
  f.overlay.notice('saved', 'wrong-account', 'bob')
  assert.equal(w.opacity, 0.2)
  f.overlay.notice('saved', 'sign-out', 'alice')
  f.overlay.setAccount(null)
  assert.equal(w.opacity, 0.2)
})

test('import opacity never reveals a manually hidden or unrelated-focus overlay, and disable stops hover polling', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] })
  const f = setup(t)
  await f.overlay.configure({ enabled: true }); await f.settle(); await f.overlay.poll()
  f.overlay.setAccount('alice'); await f.settle()
  f.overlay.toggleVisibility(false)
  f.overlay.notice('saved', 'hidden', 'alice')
  assert.equal(f.overlay.window.isVisible(), false)
  f.overlay.toggleVisibility(true); await f.settle()
  f.setFocus({ active: true, game: false, bounds: null }); await f.overlay.poll()
  f.overlay.notice('saved', 'unrelated', 'alice')
  assert.equal(f.overlay.window.isVisible(), false)
  f.setFocus({ active: true, game: true, bounds: { x: 0, y: 0, width: 1280, height: 800 } }); await f.overlay.poll()
  let cursorReads = 0
  f.deps.screen.getCursorScreenPoint = () => { cursorReads++; return { x: -5000, y: -5000 } }
  t.mock.timers.tick(100)
  assert.ok(cursorReads > 0)
  await f.overlay.configure({ enabled: false })
  cursorReads = 0
  t.mock.timers.tick(200)
  assert.equal(cursorReads, 0)
  assert.equal(f.overlay.window.isVisible(), false)
})
