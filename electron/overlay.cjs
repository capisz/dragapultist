const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { loadSettings, patchSettings, readStatistics, summarize, localDay, overlayBounds, visibleFor } = require('./overlay-model.cjs')

class GameOverlay {
  constructor(deps) {
    this.deps = deps
    this.settings = loadSettings(deps.settings)
    this.window = null
    this.ready = false
    this.accountId = null
    this.model = null
    this.updatedAt = null
    this.captureStatus = 'Sign-in required'
    this.hidden = false
    this.interactive = false
    this.gameBounds = null
    this.expectedBounds = null
    this.size = { width: 320, height: 360 }
    this.error = null
    this.statsError = null
    this.shortcutErrors = []
    this.shortcuts = []
    this.generation = 0
    this.noticeValue = null
    this.notices = new Set()
    this.tail = Promise.resolve()
    this.busy = false
    this.statsBusy = false
    this.statsPending = false
    this.stopped = false
    this.lastDay = localDay(new Date())
    this.url = pathToFileURL(path.join(__dirname, 'overlay.html')).href
    this.displayChanged = () => this.reposition()
    for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) deps.screen.on?.(event, this.displayChanged)
  }

  status() {
    return {
      enabled: this.settings.enabled,
      idleOpacity: this.settings.idleOpacity,
      visibilityShortcut: this.settings.visibilityShortcut,
      interactionShortcut: this.settings.interactionShortcut,
      selectedDeckKey: this.accountId ? this.settings.selections[this.accountId] || null : null,
      visible: !!this.window?.isVisible(),
      interactive: this.interactive,
      hidden: this.hidden,
      error: this.error,
      statsError: this.statsError,
      shortcutErrors: this.shortcutErrors,
    }
  }

  state() {
    return {
      ...this.status(),
      ...summarize(this.model, this.status().selectedDeckKey),
      signedIn: !!this.accountId,
      loaded: !!this.model,
      updatedAt: this.updatedAt,
      captureStatus: this.captureStatus,
      notice: this.noticeValue && this.noticeValue.expiresAt > Date.now() ? this.noticeValue : null,
    }
  }

  publish(notify = true) {
    this.updateOpacity()
    const state = this.state(), serialized = JSON.stringify(state)
    if (this.ready && this.window && !this.window.isDestroyed() && serialized !== this.lastPublished) {
      this.lastPublished = serialized
      this.window.webContents.send('overlay:state', state)
    }
    const status = JSON.stringify(this.status())
    if (notify && status !== this.lastStatus) { this.lastStatus = status; this.deps.onChange?.() }
  }

  setCaptureStatus(status) {
    if (this.captureStatus === status) return
    this.captureStatus = status
    this.publish(false)
  }

  setAccount(id) {
    if (this.accountId === id) return
    this.accountId = id
    this.generation++
    this.model = null
    this.updatedAt = null
    this.noticeValue = null
    this.notices.clear()
    this.statsError = null
    this.publish(false)
    if (id && this.settings.enabled) void this.refreshStats()
  }

  createWindow() {
    if (this.window || this.stopped) return
    const { BrowserWindow } = this.deps
    this.lastPublished = null
    this.lastOpacity = null
    this.window = new BrowserWindow({
      width: 320, height: 360, show: false, frame: false, transparent: true,
      resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
      alwaysOnTop: true, skipTaskbar: true, focusable: false, hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, 'overlay-preload.js'),
        contextIsolation: true, nodeIntegration: false, sandbox: true,
        partition: 'dragapultist-overlay', backgroundThrottling: false,
      },
    })
    this.window.setIgnoreMouseEvents(true)
    this.updateOpacity()
    this.window.setAlwaysOnTop(true, 'floating')
    if (process.platform === 'darwin') this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    this.window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    this.window.webContents.on('will-navigate', event => event.preventDefault())
    this.window.webContents.on('will-redirect', event => event.preventDefault())
    this.window.webContents.on('will-attach-webview', event => event.preventDefault())
    const isolatedSession = this.window.webContents.session
    isolatedSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
    isolatedSession.setPermissionCheckHandler(() => false)
    this.window.webContents.on('did-finish-load', () => { this.ready = true; this.publish(); void this.poll() })
    this.window.webContents.on('render-process-gone', () => {
      this.ready = false
      this.hide()
      this.error = 'Overlay stopped. Turn the overlay off and on to reload it.'
      this.publish()
    })
    this.window.on('close', event => { if (!this.stopped) { event.preventDefault(); this.toggleVisibility(false) } })
    this.window.on('move', () => {
      if (!this.interactive || !this.gameBounds) return
      const bounds = this.window.getBounds()
      if (bounds.x === this.expectedBounds?.x && bounds.y === this.expectedBounds?.y) return
      clearTimeout(this.moveTimer)
      this.moveTimer = setTimeout(() => {
        if (this.stopped || !this.gameBounds) return
        const moved = this.window.getBounds()
        void this.configure({ position: { x: moved.x - this.gameBounds.x, y: moved.y - this.gameBounds.y } }).catch(error => { this.error = error.message; this.publish() })
      }, 250)
    })
    void this.window.loadFile(path.join(__dirname, 'overlay.html')).catch(() => {
      this.error = 'The overlay could not load. Turn it off and on to retry.'
      this.publish()
    })
    // No access to the website session, clipboard, filesystem, or import queue.
    this.deps.ipcMain.handle('overlay:request', async (event, request) => {
      if (this.stopped || event.sender !== this.window?.webContents || event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== this.url || request?.version !== 1) throw Error('Untrusted overlay request')
      if (request.method === 'state') return this.state()
      if (request.method === 'lock') { this.lock(); return this.state() }
      if (request.method === 'hide') { this.toggleVisibility(false); return this.state() }
      if (request.method === 'select') { await this.configure({ selectedDeckKey: request.value }); return this.state() }
      if (request.method === 'resize') {
        if (!Number.isInteger(request.value) || request.value < 140 || request.value > 640) throw Error('Invalid overlay height')
        if (this.size.height !== request.value) {
          this.size.height = request.value
          this.reposition()
        }
        return null
      }
      throw Error('Unknown overlay operation')
    })
    this.window.on('blur', () => { if (this.interactive) void this.poll() })
  }

  bindShortcuts() {
    const shortcuts = this.deps.globalShortcut
    for (const key of this.shortcuts) shortcuts.unregister(key)
    this.shortcuts = []
    this.shortcutErrors = []
    if (!this.settings.enabled || this.stopped) return
    for (const [name, key, callback] of [
      ['Visibility', this.settings.visibilityShortcut, () => this.toggleVisibility()],
      ['Interaction', this.settings.interactionShortcut, () => this.toggleInteraction()],
    ]) {
      try {
        if (!shortcuts.register(key, callback)) throw Error('unavailable')
        this.shortcuts.push(key)
      } catch { this.shortcutErrors.push(`${name} shortcut ${key} is unavailable. Use the tray controls or choose another shortcut.`) }
    }
  }

  start() {
    if (this.stopped) return
    this.bindShortcuts()
    if (!this.settings.enabled) return
    this.createWindow()
    clearInterval(this.pollTimer)
    clearInterval(this.statsTimer)
    clearInterval(this.opacityTimer)
    this.pollTimer = setInterval(() => void this.poll(), 1000)
    this.statsTimer = setInterval(() => void this.refreshStats(), 60000)
    // Native cursor bounds work even at 0% opacity and while clicks pass through.
    // Never expose or persist pointer coordinates in either renderer bridge.
    this.opacityTimer = setInterval(() => this.updateOpacity(), 100)
    void this.refreshStats()
    void this.poll()
  }

  configure(patch) {
    const task = this.tail.then(async () => {
      if (this.stopped) throw Error('The overlay is shutting down.')
      const next = patchSettings(this.settings, patch, this.accountId, this.model?.decks)
      await this.deps.saveSettings(next)
      const wasEnabled = this.settings.enabled
      this.settings = next
      if (Object.hasOwn(patch, 'position')) this.gameBounds = null
      if (!next.enabled) {
        clearInterval(this.pollTimer); clearInterval(this.statsTimer); clearInterval(this.opacityTimer)
        this.hide()
        this.bindShortcuts()
      } else if (!wasEnabled || (this.error && Object.hasOwn(patch, 'enabled'))) {
        this.hidden = false
        this.error = null
        if (this.window && !this.ready) {
          this.deps.ipcMain.removeHandler('overlay:request')
          this.window.destroy(); this.window = null
        }
        this.start()
      } else if (Object.hasOwn(patch, 'visibilityShortcut') || Object.hasOwn(patch, 'interactionShortcut')) this.bindShortcuts()
      this.publish()
      return this.status()
    })
    this.tail = task.catch(() => {})
    return task
  }

  hide() {
    this.lock(false)
    this.window?.hide()
    this.publish()
  }

  updateOpacity() {
    if (this.stopped || !this.window || this.window.isDestroyed()) return
    let hovered = false
    if (this.window.isVisible()) {
      try {
        const point = this.deps.screen.getCursorScreenPoint(), bounds = this.window.getBounds()
        hovered = point.x >= bounds.x && point.x < bounds.x + bounds.width && point.y >= bounds.y && point.y < bounds.y + bounds.height
      } catch { hovered = true } // Keep controls readable if cursor lookup fails.
    }
    const noticeActive = this.noticeValue && this.noticeValue.expiresAt > Date.now()
    const opacity = this.interactive || hovered || noticeActive ? 1 : this.settings.idleOpacity
    if (opacity !== this.lastOpacity) {
      this.window.setOpacity(opacity)
      this.lastOpacity = opacity
    }
  }

  lock(notify = true) {
    const wasInteractive = this.interactive
    this.interactive = false
    if (this.window && !this.window.isDestroyed()) {
      this.window.setIgnoreMouseEvents(true)
      this.window.setFocusable(false)
      this.window.blur()
    }
    if (notify && wasInteractive) void this.deps.returnGameFocus?.().catch(() => {
      this.error = 'Click the game to resume keyboard control.'
      this.publish()
    })
    this.updateOpacity()
    if (notify) this.publish()
  }

  toggleVisibility(value) {
    if (!this.settings.enabled) return
    this.hidden = typeof value === 'boolean' ? !value : !this.hidden
    if (this.hidden) this.hide()
    else { void this.poll(); this.publish() }
  }

  toggleInteraction() {
    if (!this.settings.enabled || !this.window?.isVisible()) return
    if (this.interactive) return this.lock()
    this.interactive = true
    this.window.setIgnoreMouseEvents(false)
    this.window.setFocusable(true)
    this.window.show()
    this.deps.app?.focus({ steal: true })
    this.window.focus()
    this.publish()
  }

  async interactFromTray() {
    if (!this.settings.enabled || this.stopped) return
    if (this.interactive) return this.lock()
    // A tray menu can temporarily take foreground focus and hide the panel.
    // This explicit action may return to the verified running game first.
    this.hidden = false
    if (!this.window?.isVisible()) {
      await this.deps.returnGameFocus?.()
      await this.poll()
      if (!this.window?.isVisible()) await this.poll()
    }
    this.toggleInteraction()
  }

  async poll() {
    if (this.stopped || !this.settings.enabled) return
    if (this.busy) return this.focusCompletion
    let finished
    this.focusCompletion = new Promise(resolve => { finished = resolve })
    this.busy = true
    try {
      const focus = await this.deps.readFocus()
      if (this.stopped || !this.settings.enabled) return
      this.error = null
      const visible = visibleFor({ enabled: this.settings.enabled, hidden: this.hidden, active: focus.active, game: focus.game, interactive: this.interactive, overlayFocused: this.window?.isFocused() })
      if (visible && this.ready) {
        if (focus.game) {
          const changed = JSON.stringify(this.gameBounds) !== JSON.stringify(focus.bounds)
          this.gameBounds = focus.bounds
          if (changed || !this.window.isVisible()) {
            this.reposition()
          }
        }
        if (!this.window.isVisible()) this.window.showInactive()
      } else if (this.window?.isVisible()) this.hide()
      const day = localDay(new Date())
      if (day !== this.lastDay) { this.lastDay = day; void this.refreshStats() }
      this.publish()
    } catch {
      if (this.stopped || !this.settings.enabled) return
      this.error = 'Game focus detection is unavailable. The overlay is hidden; turn it off and on to retry.'
      this.hide()
    } finally { this.busy = false; finished() }
  }

  reposition() {
    if (!this.window || !this.gameBounds || this.stopped) return
    const display = this.deps.screen.getDisplayMatching(this.gameBounds)
    this.expectedBounds = overlayBounds(this.gameBounds, display.workArea, this.settings.position, this.size)
    this.window.setBounds(this.expectedBounds)
  }

  async refreshStats() {
    if (this.stopped || !this.settings.enabled || !this.accountId) return
    if (this.statsBusy) { this.statsPending = true; return }
    this.statsBusy = true
    const account = this.accountId, generation = this.generation
    try {
      const model = readStatistics(await this.deps.readStats(account))
      if (this.stopped || this.generation !== generation || this.accountId !== account) return
      this.model = model
      this.statsError = null
      this.updatedAt = new Date().toISOString()
    } catch {
      if (this.generation === generation) this.statsError = 'Statistics unavailable. Last successful results may be out of date.'
    } finally {
      this.statsBusy = false
      this.publish()
      if (this.statsPending) { this.statsPending = false; void this.refreshStats() }
    }
  }

  notice(kind, id, owner) {
    if (!this.settings.enabled || !this.accountId || owner !== this.accountId || !['queued', 'saved', 'duplicate', 'review', 'failed'].includes(kind) || typeof id !== 'string' || id.length > 128) return
    const token = `${id}:${kind}`
    if (this.notices.has(token)) return
    this.notices.add(token)
    if (this.notices.size > 500) this.notices.delete(this.notices.values().next().value)
    const messages = { queued: 'Game log queued', saved: 'Game imported', duplicate: 'Game already imported', review: 'Import needs review — open Dragapultist', failed: 'Import delayed — log retained for retry' }
    this.noticeValue = { kind, message: messages[kind], expiresAt: Date.now() + 4000 }
    clearTimeout(this.noticeTimer)
    this.noticeTimer = setTimeout(() => { this.noticeValue = null; this.publish() }, 4000)
    if (kind === 'saved' || kind === 'duplicate') void this.refreshStats()
    this.publish()
  }

  stop() {
    this.stopped = true
    this.generation++
    for (const timer of [this.pollTimer, this.statsTimer, this.opacityTimer]) clearInterval(timer)
    for (const timer of [this.moveTimer, this.noticeTimer]) clearTimeout(timer)
    for (const key of this.shortcuts) this.deps.globalShortcut.unregister(key)
    for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) this.deps.screen.removeListener?.(event, this.displayChanged)
    this.deps.ipcMain.removeHandler('overlay:request')
    this.window?.destroy()
    this.window = null
  }
}

module.exports = { GameOverlay }
