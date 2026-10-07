const fs = require('node:fs/promises')
const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const exec = promisify(execFile)

// Windows filename appears in the official Pokémon support forum. On Mac, verify
// the installed app's own Info.plist before accepting its bundle identifier.
const WINDOWS_EXECUTABLE = 'pokemon tcg live.exe'
const MAC_APPLICATION = 'Pokemon TCG Live.app'
let windowsModule
const macBundles = new Map()
let gameTarget = null

function createActiveReader(provider, timeout = 2000) {
  let pending = null
  let stalled = false
  return async () => {
    if (pending && stalled) throw Error('Game focus detection timed out')
    if (!pending) pending = Promise.resolve().then(provider).then(
      value => { pending = null; stalled = false; return value },
      error => { pending = null; stalled = false; throw error },
    )
    let timer
    try {
      return await Promise.race([pending, new Promise((_resolve, reject) => { timer = setTimeout(() => { stalled = true; reject(Error('Game focus detection timed out')) }, timeout) })])
    } finally { clearTimeout(timer) }
  }
}

const readActive = createActiveReader(async () => {
  windowsModule ||= import('get-windows').catch(error => { windowsModule = null; throw error })
  const { activeWindow } = await windowsModule
  return activeWindow({ accessibilityPermission: false, screenRecordingPermission: false })
})

async function installedBundle(appPath) {
  const plist = path.join(appPath, 'Contents', 'Info.plist')
  await fs.access(plist)
  const { stdout } = await exec('/usr/bin/plutil', ['-convert', 'json', '-o', '-', plist], { timeout: 3000, maxBuffer: 65536 })
  const info = JSON.parse(stdout)
  const executable = info.CFBundleExecutable
  if (typeof executable !== 'string' || !executable || executable.length > 120 || path.basename(executable) !== executable || typeof info.CFBundleIdentifier !== 'string' || !info.CFBundleIdentifier || info.CFBundleIdentifier.length > 256) return null
  // Use the installed executable name rather than guessing Unity's build name.
  await fs.access(path.join(appPath, 'Contents', 'MacOS', executable), require('node:fs').constants.X_OK)
  return info.CFBundleIdentifier
}

async function isGameWindow(active, platform = process.platform, readBundle = installedBundle) {
  if (!active?.owner || !active.bounds || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(active.bounds[k])) || active.bounds.width <= 0 || active.bounds.height <= 0) return false
  if (platform === 'win32') return path.win32.basename(active.owner.path || '').toLowerCase() === WINDOWS_EXECUTABLE
  if (platform !== 'darwin') return false
  const appPath = active.owner.path || ''
  if (path.basename(appPath) !== MAC_APPLICATION || typeof active.owner.bundleId !== 'string') return false
  if (!macBundles.has(appPath)) {
    try {
      const bundleId = await readBundle(appPath)
      if (typeof bundleId !== 'string' || !bundleId) return false
      macBundles.set(appPath, bundleId)
    } catch { return false }
  }
  return macBundles.get(appPath) === active.owner.bundleId
}

async function readGameFocus() {
  const active = await readActive()
  if (!active) return { active: false, game: false, bounds: null }
  const game = await isGameWindow(active)
  if (game && Number.isSafeInteger(active.owner.processId) && active.owner.processId > 0) {
    gameTarget = { pid: active.owner.processId, bundleId: active.owner.bundleId, id: active.id }
  }
  // Discard titles, browser URLs, owner paths, and every unrelated application's identity.
  return { active: true, game, bounds: game ? { ...active.bounds } : null }
}

async function returnGameFocus() {
  const target = gameTarget
  if (!target) return
  if (process.platform === 'darwin') {
    if (typeof target.bundleId !== 'string' || target.bundleId.length > 256) return
    // AppKit activation does not use Apple Events or read any game content. Check
    // the running process's bundle ID so a reused PID cannot activate another app.
    const script = `ObjC.import('AppKit'); var game = $.NSRunningApplication.runningApplicationWithProcessIdentifier(${target.pid}); if (game.isNil() || game.bundleIdentifier.js !== ${JSON.stringify(target.bundleId)}) throw new Error('Game is no longer running'); game.activateWithOptions(2);`
    await exec('/usr/bin/osascript', ['-l', 'JavaScript', '-e', script], { timeout: 3000, maxBuffer: 1024 })
  } else if (process.platform === 'win32' && Number.isSafeInteger(target.id) && target.id > 0) {
    const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class DragapultistFocus { [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); }'; $handle=[IntPtr]${target.id}; $ownerId=[uint32]0; [void][DragapultistFocus]::GetWindowThreadProcessId($handle,[ref]$ownerId); if($ownerId -eq ${target.pid}) { [void][DragapultistFocus]::SetForegroundWindow($handle) }`
    await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 3000, maxBuffer: 1024, windowsHide: true })
  }
}

module.exports = { readGameFocus, isGameWindow, installedBundle, returnGameFocus, createActiveReader }
