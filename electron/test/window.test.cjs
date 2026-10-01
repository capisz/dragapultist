const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.join(__dirname, '..')
const pending = () => new Promise(() => {})
const flush = () => new Promise(resolve => setImmediate(resolve))

async function launch({ openQueue = pending, readText = async () => '', fetch = pending, agreement = async () => ({ accepted: true, digest: 'test-agreement' }) } = {}) {
  const windows = [], intervals = [], handlers = new Map()
  let tray, clipboardReads = 0, quitCalls = 0, sessionCalls = 0
  const app = Object.assign(new EventEmitter(), {
    isPackaged: true,
    requestSingleInstanceLock: () => true,
    whenReady: () => Promise.resolve(),
    getPath: () => '/unused-test-user-data',
    quit: () => { quitCalls++ },
  })
  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super()
      this.options = options
      this.visible = options.show
      this.minimized = false
      this.destroyed = false
      this.webContents = Object.assign(new EventEmitter(), {
        mainFrame: { url: 'https://dragapultist.vercel.app/' },
        getURL: () => this.url,
        send: (_channel, value) => { this.status = value },
        setWindowOpenHandler: handler => { this.openHandler = handler },
      })
      windows.push(this)
    }
    loadURL(url) { this.url = url; return Promise.resolve() }
    loadFile(file) { this.file = file; return Promise.resolve() }
    show() { this.visible = true }
    hide() { this.visible = false }
    focus() { this.focused = true }
    restore() { this.minimized = false; this.restored = true }
    isMinimized() { return this.minimized }
    isDestroyed() { return this.destroyed }
  }
  const electron = {
    app, BrowserWindow,
    clipboard: { readText: () => { clipboardReads++; return readText() } },
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    Tray: class extends EventEmitter {
      constructor() { super(); tray = this }
      setToolTip() {}
      setContextMenu(menu) { this.menu = menu }
    },
    Menu: { buildFromTemplate: template => template },
    nativeImage: { createFromPath: () => ({ resize: () => ({}) }) },
    shell: { openExternal: async () => {} },
    Notification: { isSupported: () => false },
    safeStorage: {},
    dialog: { showErrorBox: (_title, message) => { throw Error(message) } },
    session: { fromPartition: () => { sessionCalls++; return { setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, fetch } } },
  }
  const context = vm.createContext({
    __dirname: root, process: { env: {} }, URL, AbortSignal, Buffer,
    setInterval: (callback, delay) => { intervals.push({ callback, delay }); return intervals.length },
    clearInterval() {},
    require: name => name === 'electron' ? electron : name === './startup.cjs'
      ? { openSecureQueue: (...args) => { assert.equal(windows.length, 1, 'create the window before opening storage'); return openQueue(...args) } }
      : name === './agreement.cjs' ? { ensureAgreement: agreement, focusAgreement: () => false, showLegalDocuments: async () => {} }
      : name.startsWith('.') ? require(path.join(root, name)) : require(name),
  })
  vm.runInContext(fs.readFileSync(path.join(root, 'main.js'), 'utf8'), context, { filename: 'main.js' })
  await flush()
  const request = (method, value) => {
    const current = windows.at(-1)
    return handlers.get('desktop:request')({ sender: current.webContents, senderFrame: current.webContents.mainFrame }, { version: 1, method, value })
  }
  return { app, windows, tray, intervals, request, quitCalls: () => quitCalls, sessionCalls: () => sessionCalls, clipboardReads: () => clipboardReads,
    capture: () => vm.runInContext('capture()', context),
    refreshIdentity: () => vm.runInContext('refreshIdentity()', context) }
}

function readyQueue(settings = {}) {
  return {
    data: { settings: { enabled: false, username: '', owner: null, notifications: false, captureAgreementDigest: 'test-agreement', ...settings }, entries: [] },
    async configure(patch) { Object.assign(this.data.settings, patch) },
    async add(rawLog, owner, username) { this.data.entries.push({ rawLog, owner, username }); return true },
  }
}
const signedIn = async () => ({ ok: true, json: async () => ({ user: { uid: 'account-a' } }) })

test('initializes with the actual asynchronous clipboard contract without locking capture settings', async () => {
  const queue = readyQueue()
  const run = await launch({ openQueue: async () => queue, fetch: signedIn })
  const status = await run.request('status')
  assert.equal(status.error, null)
  assert.equal(status.signedIn, true)
  assert.equal(status.state, 'Paused')
  assert.equal(run.clipboardReads(), 0, 'do not read unrelated clipboard text before capture is enabled')
})

const gameLog = "Alice drew 7 cards for the opening hand.\nTurn # 1 - Alice's Turn\nAlice played Dragapult ex.\nAlice wins."

test('enables capture and queues the resolved clipboard text with the correct account', async () => {
  const queue = readyQueue()
  let text = 'Text copied before capture was enabled'
  const run = await launch({ openQueue: async () => queue, fetch: signedIn, readText: async () => text })
  const status = await run.request('configure', { username: 'Alice', enabled: true })
  assert.equal(status.enabled, true)
  assert.equal(status.state, 'Capturing')
  assert.equal(status.error, null)
  await run.capture()
  assert.equal(queue.data.entries.length, 0)
  text = gameLog
  await run.capture()
  await run.capture()
  assert.deepEqual(queue.data.entries, [{ rawLog: gameLog, owner: 'account-a', username: 'Alice' }])
})

test('restores enabled capture at startup while awaiting the clipboard baseline', async () => {
  const queue = readyQueue({ owner: 'account-a', username: 'Alice', enabled: true })
  let finish
  const run = await launch({ openQueue: async () => queue, fetch: signedIn, readText: () => new Promise(resolve => { finish = resolve }) })
  assert.equal((await run.request('status')).state, 'Starting')
  assert.equal((await run.request('status')).error, null)
  finish(gameLog)
  await flush()
  assert.equal((await run.request('status')).state, 'Capturing')
  assert.equal(queue.data.entries.length, 0)
})

test('a clipboard rejection during enable remains retryable without locking username settings', async () => {
  const queue = readyQueue()
  let denied = true
  const run = await launch({ openQueue: async () => queue, fetch: signedIn, readText: async () => { if (denied) throw Error('permission denied'); return '' } })
  await assert.rejects(run.request('configure', { username: 'Alice', enabled: true }), /Could not read the clipboard/)
  assert.equal(queue.data.settings.enabled, false)
  assert.equal((await run.request('status')).error, null)
  denied = false
  assert.equal((await run.request('configure', { username: 'Alice', enabled: true })).enabled, true)
})

test('overlapping polls wait for a single clipboard read', async () => {
  const queue = readyQueue()
  let finish, deferred = false
  const run = await launch({ openQueue: async () => queue, fetch: signedIn, readText: () => deferred ? new Promise(resolve => { finish = resolve }) : Promise.resolve('') })
  await run.request('configure', { username: 'Alice', enabled: true })
  deferred = true
  const first = run.capture()
  const count = run.clipboardReads()
  await run.capture()
  assert.equal(run.clipboardReads(), count)
  finish(gameLog)
  await first
  assert.equal(queue.data.entries.length, 1)
})

test('a clipboard read finishing after pause and resume cannot capture stale text', async () => {
  const queue = readyQueue()
  let finish, deferred = false
  const run = await launch({ openQueue: async () => queue, fetch: signedIn, readText: () => deferred ? new Promise(resolve => { finish = resolve }) : Promise.resolve('') })
  await run.request('configure', { username: 'Alice', enabled: true })
  deferred = true
  const capture = run.capture()
  await run.request('configure', { enabled: false })
  deferred = false
  await run.request('configure', { username: 'Alice', enabled: true })
  finish(gameLog)
  await capture
  assert.equal(queue.data.entries.length, 0)
  assert.equal((await run.request('status')).enabled, true)
})

test('a clipboard read cannot cross an account change', async () => {
  const queue = readyQueue()
  let owner = 'account-a', finish, deferred = false
  const fetch = async () => ({ ok: true, json: async () => ({ user: { uid: owner } }) })
  const run = await launch({ openQueue: async () => queue, fetch, readText: () => deferred ? new Promise(resolve => { finish = resolve }) : Promise.resolve('') })
  await run.request('configure', { username: 'Alice', enabled: true })
  deferred = true
  const capture = run.capture()
  owner = 'account-b'
  await run.refreshIdentity()
  finish(gameLog)
  await capture
  assert.equal(queue.data.entries.length, 0)
  assert.equal(queue.data.settings.owner, 'account-b')
  assert.equal(queue.data.settings.enabled, false)
  assert.equal(queue.data.settings.username, '')
})

test('an account change while enabling capture does not save the old username into the new account', async () => {
  const queue = readyQueue()
  let owner = 'account-a', finish
  const fetch = async () => ({ ok: true, json: async () => ({ user: { uid: owner } }) })
  const run = await launch({ openQueue: async () => queue, fetch, readText: () => new Promise(resolve => { finish = resolve }) })
  const enable = run.request('configure', { username: 'Alice', enabled: true })
  const rejected = assert.rejects(enable, /session changed/)
  await flush()
  owner = 'account-b'
  await run.refreshIdentity()
  finish('')
  await rejected
  assert.equal(queue.data.settings.owner, 'account-b')
  assert.equal(queue.data.settings.enabled, false)
  assert.equal(queue.data.settings.username, '')
})

test('opens a visible window and serves status while storage and the network are stalled', async () => {
  const run = await launch()
  const window = run.windows[0]
  assert.equal(window.visible, true)
  assert.equal(window.listenerCount('ready-to-show'), 0)
  assert.equal(window.options.webPreferences.contextIsolation, true)
  assert.equal(window.options.webPreferences.nodeIntegration, false)
  assert.equal(window.options.webPreferences.sandbox, true)
  assert.equal((await run.request('status')).state, 'Starting')
  assert.equal((await run.request('status')).enabled, false)
  assert.equal(await run.request('next'), null)
  await assert.rejects(run.request('configure', { enabled: true }), /still starting/)
  await run.intervals.find(interval => interval.delay === 1000).callback()
  assert.equal(run.clipboardReads(), 0)
})

test('a storage failure leaves the window available and exposes a paused error', async () => {
  const run = await launch({ openQueue: async () => { throw Error('Secure storage did not respond. Capture is paused.') } })
  const status = await run.request('status')
  assert.equal(run.windows[0].visible, true)
  assert.equal(status.state, 'Paused')
  assert.equal(status.enabled, false)
  assert.match(status.error, /Secure storage did not respond/)
  assert.equal(await run.request('next'), null)
  assert.equal(run.tray.menu.find(item => item.label === 'Resume capture').enabled, false)
})

test('Dock activation, second launch and the tray restore a minimized window during startup', async () => {
  const run = await launch()
  const window = run.windows[0]
  const reopen = [() => run.app.emit('activate'), () => run.app.emit('second-instance'), () => run.tray.emit('click'), () => run.tray.menu[0].click()]
  for (const action of reopen) {
    window.minimized = true; window.visible = false; window.restored = false; window.focused = false
    action()
    assert.equal(window.restored, true)
    assert.equal(window.visible, true)
    assert.equal(window.focused, true)
    assert.equal(run.windows.length, 1)
  }
})

test('recreates a destroyed window and still hides on close for tray capture', async () => {
  const run = await launch()
  run.windows[0].destroyed = true
  run.windows[0].emit('closed')
  run.app.emit('activate')
  const window = run.windows[1]
  assert.equal(window.visible, true)
  let prevented = false
  window.emit('close', { preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  assert.equal(window.visible, false)
  run.app.emit('activate')
  assert.equal(window.visible, true)
})

test('a failed website load still opens the local offline page', async () => {
  const run = await launch()
  const window = run.windows[0]
  window.webContents.emit('did-fail-load', {}, -106, 'offline', 'https://dragapultist.vercel.app/', true)
  assert.equal(window.file, path.join(root, 'offline.html'))
  assert.equal(window.visible, true)
})


test('waits for agreement before opening web sessions, storage, timers or clipboard', async () => {
  let decide, storageCalls = 0
  const run = await launch({ agreement: () => new Promise(resolve => { decide = resolve }),
    openQueue: async () => { storageCalls++; return readyQueue() } })
  assert.equal(run.windows.length, 0)
  assert.equal(run.sessionCalls(), 0)
  assert.equal(run.intervals.length, 0)
  assert.equal(storageCalls, 0)
  assert.equal(run.clipboardReads(), 0)
  run.app.emit('activate')
  assert.equal(run.windows.length, 0)
  decide({ accepted: false })
  await flush()
  assert.equal(run.quitCalls(), 1)
  assert.equal(run.sessionCalls(), 0)
})

test('a changed agreement durably disables capture before any clipboard read and preserves queued logs', async () => {
  const queue = readyQueue({ owner: 'account-a', username: 'Alice', enabled: true, captureAgreementDigest: 'old-agreement' })
  queue.data.entries.push({ id: 'keep-me', owner: 'account-a', rawLog: gameLog })
  let finishSave
  queue.configure = patch => new Promise(resolve => { finishSave = () => { Object.assign(queue.data.settings, patch); resolve() } })
  const run = await launch({ openQueue: async () => queue, fetch: signedIn })
  assert.equal(run.clipboardReads(), 0)
  assert.equal((await run.request('status')).enabled, false)
  finishSave()
  await flush()
  assert.equal(queue.data.settings.enabled, false)
  assert.equal(queue.data.settings.captureAgreementDigest, 'test-agreement')
  assert.equal(queue.data.entries[0].id, 'keep-me')
  assert.equal(run.clipboardReads(), 0)
})
