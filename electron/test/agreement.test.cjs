const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const vm = require('node:vm')
const { createHash } = require('node:crypto')
const { pathToFileURL } = require('node:url')
const flush = () => new Promise(resolve => setImmediate(resolve))

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dragapultist-agreement-test-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const documents = ['terms', 'privacy'].map(id => {
    const text = `Synthetic ${id} test fixture. Not a legal agreement.`
    return { id, title: id, text, sha256: createHash('sha256').update(text).digest('hex') }
  })
  const manifest = { version: 'test.1', contactEmail: 'test@example.invalid', documents,
    digest: createHash('sha256').update(JSON.stringify({ version: 'test.1', documents })).digest('hex') }
  const manifestFile = path.join(root, 'legal/generated/manifest.json')
  await fs.mkdir(path.dirname(manifestFile), { recursive: true })
  await fs.writeFile(manifestFile, JSON.stringify(manifest))
  const windows = [], handlers = new Map()
  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super(); this.options = options; this.destroyed = false
      this.webContents = Object.assign(new EventEmitter(), {
        mainFrame: { url: pathToFileURL(path.join(root, 'agreement.html')).href },
        session: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {},
          webRequest: { onBeforeRequest: callback => { this.network = callback } } },
        setWindowOpenHandler: handler => { this.openHandler = handler },
      })
      windows.push(this)
    }
    isDestroyed() { return this.destroyed }
    isMinimized() { return false }
    show() {} focus() {}
    loadFile() { return Promise.resolve() }
    close() { this.destroyed = true; this.emit('closed') }
  }
  const app = { getPath: () => path.join(root, 'profile'), getVersion: () => '0.0.0-test' }
  const module = { exports: {} }
  vm.runInNewContext(await fs.readFile(path.join(__dirname, '../agreement.cjs'), 'utf8'),
    { __dirname: root, require, module }, { filename: 'agreement.cjs' })
  const deps = { app, BrowserWindow, ipcMain: { handle: (name, handler) => handlers.set(name, handler) } }
  const begin = async () => {
    const result = module.exports.ensureAgreement(deps)
    for (let i = 0; i < 50 && !windows.length; i++) await new Promise(resolve => setTimeout(resolve, 5))
    assert.equal(windows.length, 1)
    return { result, window: windows[0] }
  }
  const request = (method, choices, event) => {
    const sender = windows.at(-1).webContents
    return handlers.get('agreement:request')(event || { sender, senderFrame: sender.mainFrame }, { method, choices })
  }
  return { root, manifest, manifestFile, app, windows, begin, request,
    ensure: () => module.exports.ensureAgreement(deps) }
}

test('first launch enforces both choices, blocks other senders and remote requests, then stores exact document receipt', async t => {
  const f = await fixture(t)
  const { result, window } = await f.begin()
  assert.equal(window.options.webPreferences.nodeIntegration, false)
  assert.equal(window.options.webPreferences.sandbox, true)
  let blocked
  window.network({ url: 'https://example.invalid/' }, value => { blocked = value.cancel })
  assert.equal(blocked, true)
  assert.equal(window.openHandler().action, 'deny')
  await assert.rejects(f.request('accept', { termsAccepted: true }), /both confirmations/)
  await assert.rejects(f.request('documents', undefined, { sender: {}, senderFrame: {} }), /Untrusted/)
  await assert.rejects(fs.access(path.join(f.root, 'profile/agreement-acceptance.json')))
  await f.request('accept', { termsAccepted: true, privacyAcknowledged: true })
  assert.equal((await result).accepted, true)
  const receipt = JSON.parse(await fs.readFile(path.join(f.root, 'profile/agreement-acceptance.json'), 'utf8'))
  assert.equal(receipt.digest, f.manifest.digest)
  assert.equal(receipt.version, 'test.1')
  assert.equal(receipt.termsAccepted, true)
  assert.equal(receipt.privacyAcknowledged, true)
  assert.equal((await f.ensure()).accepted, true)
  assert.equal(f.windows.length, 1, 'matching receipt avoids another prompt')
})

test('decline and closing leave no acceptance receipt', async t => {
  const f = await fixture(t)
  const { result } = await f.begin()
  await f.request('decline')
  assert.equal((await result).accepted, false)
  await assert.rejects(fs.access(path.join(f.root, 'profile/agreement-acceptance.json')))
})

test('a stale receipt requires a new choice', async t => {
  const f = await fixture(t)
  await fs.mkdir(path.join(f.root, 'profile'))
  await fs.writeFile(path.join(f.root, 'profile/agreement-acceptance.json'), JSON.stringify({
    schemaVersion: 1, version: f.manifest.version, digest: 'old-digest', termsAccepted: true,
    privacyAcknowledged: true, acceptedAt: new Date().toISOString(),
  }))
  const { result, window } = await f.begin()
  window.close()
  assert.equal((await result).accepted, false)
})

test('tampered packaged text fails closed before a reader is created', async t => {
  const f = await fixture(t)
  f.manifest.documents[0].text += ' changed'
  await fs.writeFile(f.manifestFile, JSON.stringify(f.manifest))
  await assert.rejects(f.ensure(), /could not be verified/)
  assert.equal(f.windows.length, 0)
})
