const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { openSecureQueue } = require('../startup.cjs')

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'desktop-startup-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const key = crypto.randomBytes(32)
  return {
    file: path.join(directory, 'capture-queue.enc'),
    storage: {
      isAsyncEncryptionAvailable: async () => true,
      encryptStringAsync: async text => {
        const iv = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
        const bytes = Buffer.concat([cipher.update(text), cipher.final()])
        return Buffer.concat([iv, cipher.getAuthTag(), bytes])
      },
      decryptStringAsync: async bytes => {
        const cipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12))
        cipher.setAuthTag(bytes.subarray(12, 28))
        return { result: Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString(), shouldReEncrypt: false }
      },
    },
  }
}

test('unwraps the Electron async decryption result and restores the encrypted queue', async t => {
  const { file, storage } = await fixture(t)
  const queue = await openSecureQueue(file, storage)
  const log = "Alice drew 7 cards for the opening hand.\nTurn # 1 - Alice's Turn\nAlice played Dragapult ex."
  await queue.configure({ owner: 'account-a', username: 'Alice', enabled: true })
  await queue.add(log, 'account-a', 'Alice')
  const original = await fs.readFile(file)
  assert.equal(original.includes(Buffer.from(log)), false)
  const restored = await openSecureQueue(file, storage)
  assert.equal(restored.data.settings.enabled, true)
  assert.equal(restored.next('account-a').rawLog, log)
  assert.equal(restored.next('account-b'), undefined)
  assert.deepEqual(await fs.readFile(file), original)
})

test('unavailable OS encryption never creates a plaintext fallback', async t => {
  const { file, storage } = await fixture(t)
  storage.isAsyncEncryptionAvailable = async () => false
  await assert.rejects(openSecureQueue(file, storage), /encryption is unavailable.*paused/)
  await assert.rejects(fs.stat(file), { code: 'ENOENT' })
})

test('a stalled encryption check times out without modifying a saved queue, even if it later finishes', async t => {
  const { file, storage } = await fixture(t)
  const queue = await openSecureQueue(file, storage)
  await queue.configure({ username: 'Alice' })
  const original = await fs.readFile(file)
  let finish
  storage.isAsyncEncryptionAvailable = () => new Promise(resolve => { finish = resolve })
  await assert.rejects(openSecureQueue(file, storage, { timeoutMs: 10 }), /did not respond.*preserved/)
  finish(true)
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.deepEqual(await fs.readFile(file), original)
})

test('a stalled decryption also times out and retains the encrypted file', async t => {
  const { file, storage } = await fixture(t)
  const queue = await openSecureQueue(file, storage)
  await queue.configure({ username: 'Alice' })
  const original = await fs.readFile(file)
  storage.decryptStringAsync = () => new Promise(() => {})
  await assert.rejects(openSecureQueue(file, storage, { timeoutMs: 10 }), /did not respond/)
  assert.deepEqual(await fs.readFile(file), original)
})

test('an invalid decryption response pauses capture without replacing the saved queue', async t => {
  const { file, storage } = await fixture(t)
  const queue = await openSecureQueue(file, storage)
  await queue.configure({ username: 'Alice' })
  const original = await fs.readFile(file)
  storage.decryptStringAsync = async () => ({ result: null })
  await assert.rejects(openSecureQueue(file, storage), /preserved.*paused/)
  assert.deepEqual(await fs.readFile(file), original)
})
