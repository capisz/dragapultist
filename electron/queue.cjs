const fs = require('node:fs/promises')
const path = require('node:path')
const { createHash, randomUUID } = require('node:crypto')
const MAX_BYTES = 262144
const fingerprint = text => createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex')
function looksLikeLog(text) {
  return typeof text === 'string' && Buffer.byteLength(text, 'utf8') <= MAX_BYTES &&
    /(?:Turn\s*#\s*\d+|[^\n]+[’']s Turn)/i.test(text) &&
    /(?:opening hand|opening coin flip)/i.test(text) && /drew|played/i.test(text)
}
class DurableQueue {
  constructor(file, crypto) { this.file = file; this.crypto = crypto; this.tail = Promise.resolve(); this.data = { version: 1, settings: { enabled: false, notifications: true, launchAtLogin: false, username: '', owner: null }, entries: [] } }
  async load() {
    try {
      const value = JSON.parse(await this.crypto.decrypt(await fs.readFile(this.file)))
      if (value.version !== 1 || !Array.isArray(value.entries) || !value.settings || value.entries.some(e => !e.id || !e.owner || typeof e.rawLog !== 'string')) throw Error('Invalid queue format')
      this.data = value
    } catch (error) { if (error.code !== 'ENOENT') throw Error('The saved queue could not be opened. It has been preserved; capture is paused.') }
  }
  change(fn) {
    const run = this.tail.then(async () => {
      const next = structuredClone(this.data); const result = fn(next)
      await fs.mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 })
      const temp = `${this.file}.${randomUUID()}.tmp`
      try {
        const handle = await fs.open(temp, 'wx', 0o600)
        try { await handle.writeFile(await this.crypto.encrypt(JSON.stringify(next))); await handle.sync() } finally { await handle.close() }
        await fs.rename(temp, this.file); this.data = next
      } finally { await fs.rm(temp, { force: true }).catch(() => {}) }
      return result
    })
    this.tail = run.catch(() => {}); return run
  }
  configure(patch) { return this.change(d => Object.assign(d.settings, patch)) }
  add(rawLog, owner, username) {
    if (!owner || !looksLikeLog(rawLog)) return Promise.resolve(false)
    return this.change(d => {
      const hash = fingerprint(rawLog)
      if (d.entries.some(e => e.owner === owner && e.hash === hash)) return false
      if (d.entries.length >= 1000) throw Error('Queue full. Capture paused; copy this log again after syncing.')
      d.entries.push({ id: randomUUID(), owner, username, rawLog, hash, capturedAt: new Date().toISOString(), attempts: 0, nextAttempt: 0, state: 'pending' }); return true
    })
  }
  next(owner, now = Date.now()) { return this.data.entries.find(e => e.owner === owner && e.state === 'pending' && e.nextAttempt <= now) }
  acknowledge(id, owner) { return this.change(d => { d.entries = d.entries.filter(e => !(e.id === id && e.owner === owner)); d.lastSynced = Date.now() }) }
  fail(id, owner, reason, review = false) { return this.change(d => { const e = d.entries.find(e => e.id === id && e.owner === owner); if (!e) return; e.attempts++; e.reason = reason; e.state = review ? 'review' : 'pending'; e.nextAttempt = Date.now() + Math.min(300000, 2000 * 2 ** Math.min(e.attempts, 8)) }) }
  review(id, owner, username) { return this.change(d => { const e = d.entries.find(e => e.id === id && e.owner === owner); if (!e) throw Error('Queued log not available for this account'); e.username = username; e.state = 'pending'; e.nextAttempt = 0 }) }
}
module.exports = { DurableQueue, looksLikeLog, fingerprint, MAX_BYTES }
