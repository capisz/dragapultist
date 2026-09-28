const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.join(__dirname, '..')
const pending = () => new Promise(() => {})
const flush = () => new Promise(resolve => setImmediate(resolve))

async function launch({ openQueue = pending } = {}) {
  const windows = [], intervals = [], handlers = new Map()
  let tray, clipboardReads = 0
  const app = Object.assign(new EventEmitter(), {
    isPackaged: true,
    requestSingleInstanceLock: () => true,
    whenReady: () => Promise.resolve(),
    getPath: () => '/unused-test-user-data',
    quit: () => {},
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
    clipboard: { readText: () => { clipboardReads++; return '' } },
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
    session: { fromPartition: () => ({ setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, fetch: pending }) },
  }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'main.js'), 'utf8'), {
    __dirname: root, process: { env: {} }, URL, AbortSignal, Buffer,
    setInterval: (callback, delay) => { intervals.push({ callback, delay }); return intervals.length },
    clearInterval() {},
    require: name => name === 'electron' ? electron : name === './startup.cjs'
      ? { openSecureQueue: (...args) => { assert.equal(windows.length, 1, 'create the window before opening storage'); return openQueue(...args) } }
      : name.startsWith('.') ? require(path.join(root, name)) : require(name),
  }, { filename: 'main.js' })
  await flush()
  const request = (method, value) => {
    const current = windows.at(-1)
    return handlers.get('desktop:request')({ sender: current.webContents, senderFrame: current.webContents.mainFrame }, { version: 1, method, value })
  }
  return { app, windows, tray, intervals, request, clipboardReads: () => clipboardReads }
}

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
  assert.equal(run.tray.menu[1].enabled, false)
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
