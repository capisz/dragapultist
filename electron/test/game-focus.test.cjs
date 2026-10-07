const { test } = require('node:test')
const assert = require('node:assert/strict')
const { isGameWindow, installedBundle, createActiveReader } = require('../game-focus.cjs')
const active = owner => ({ owner, bounds: { x: 0, y: 0, width: 1280, height: 800 } })

test('Windows matches the executable rather than a spoofable window title', async () => {
  assert.equal(await isGameWindow(active({ path: 'C:\\Games\\Pokemon TCG Live.exe' }), 'win32'), true)
  assert.equal(await isGameWindow({ ...active({ path: 'C:\\Windows\\notepad.exe' }), title: 'Pokemon TCG Live' }, 'win32'), false)
  assert.equal(await isGameWindow(active({ path: 'C:\\Games\\Pokemon TCG Live.exe.backup' }), 'win32'), false)
  assert.equal(await isGameWindow({ owner: { path: 'Pokemon TCG Live.exe' }, bounds: { width: -1 } }, 'win32'), false)
})
test('Mac verifies the installed app metadata before matching its bundle ID, without reading unrelated apps', async () => {
  let reads = 0
  const readBundle = async () => { reads++; return 'verified.bundle.id' }
  assert.equal(await isGameWindow(active({ path: '/Applications/Finder.app', bundleId: 'verified.bundle.id' }), 'darwin', readBundle), false)
  assert.equal(reads, 0)
  assert.equal(await isGameWindow(active({ path: '/tmp/game/Pokemon TCG Live.app', bundleId: 'spoofed' }), 'darwin', readBundle), false)
  assert.equal(await isGameWindow(active({ path: '/tmp/game/Pokemon TCG Live.app', bundleId: 'verified.bundle.id' }), 'darwin', readBundle), true)
  assert.equal(reads, 1)
})
test('missing installed metadata and unsupported platforms do not show an overlay', async () => {
  assert.equal(await isGameWindow(active({ path: '/missing/Pokemon TCG Live.app', bundleId: 'unknown' }), 'darwin', async () => { throw Error('missing plist') }), false)
  assert.equal(await isGameWindow(active({ path: '/Applications/Pokemon TCG Live.app' }), 'linux'), false)
})

test('Mac uses the installed executable metadata, including a different Unity build name', { skip: process.platform !== 'darwin' }, async t => {
  const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os')
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'overlay-mac-app-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const bundle = path.join(root, 'Pokemon TCG Live.app')
  await fs.mkdir(path.join(bundle, 'Contents', 'MacOS'), { recursive: true })
  const plist = path.join(bundle, 'Contents', 'Info.plist')
  await fs.writeFile(plist, '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>PokemonTCGLive</string><key>CFBundleIdentifier</key><string>fixture.verified.game</string></dict></plist>')
  await fs.writeFile(path.join(bundle, 'Contents', 'MacOS', 'PokemonTCGLive'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
  assert.equal(await installedBundle(bundle), 'fixture.verified.game')
  await fs.rm(path.join(bundle, 'Contents', 'MacOS', 'PokemonTCGLive'))
  await assert.rejects(installedBundle(bundle))
})

test('a stalled native helper times out without spawning repeated helpers, then recovers', async () => {
  let finish, calls = 0
  const reader = createActiveReader(() => { calls++; return new Promise(resolve => { finish = resolve }) }, 10)
  await assert.rejects(reader(), /timed out/)
  await assert.rejects(reader(), /timed out/)
  assert.equal(calls, 1)
  finish({ active: true })
  await new Promise(resolve => setImmediate(resolve))
  const recovered = reader()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls, 2)
  finish({ active: false })
  assert.deepEqual(await recovered, { active: false })
})
