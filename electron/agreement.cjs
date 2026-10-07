const fs = require('node:fs/promises')
const path = require('node:path')
const { createHash, randomUUID } = require('node:crypto')
const { pathToFileURL } = require('node:url')

let agreementWindow = null
let agreementContext = null
let handlerInstalled = false

async function loadDocuments() {
  const manifest = JSON.parse(await fs.readFile(path.join(__dirname, 'legal/generated/manifest.json'), 'utf8'))
  if (!manifest.version || !manifest.contactEmail || !Array.isArray(manifest.documents) || manifest.documents.length !== 2) {
    throw Error('This beta package is missing its completed legal documents. Get an updated installer from the publisher.')
  }
  for (const [index, id] of ['terms', 'privacy'].entries()) {
    const document = manifest.documents[index]
    if (document.id !== id || typeof document.text !== 'string' || /\{\{[A-Z_]+\}\}/.test(document.text) ||
        createHash('sha256').update(document.text).digest('hex') !== document.sha256) throw Error('The packaged agreement could not be verified. Download the installer again.')
  }
  if (createHash('sha256').update(JSON.stringify({ version: manifest.version, documents: manifest.documents })).digest('hex') !== manifest.digest) {
    throw Error('The packaged agreement could not be verified. Download the installer again.')
  }
  return manifest
}

async function readAcceptance(app, manifest) {
  try {
    const receipt = JSON.parse(await fs.readFile(path.join(app.getPath('userData'), 'agreement-acceptance.json'), 'utf8'))
    return receipt.schemaVersion === 1 && receipt.version === manifest.version && receipt.digest === manifest.digest &&
      receipt.termsAccepted === true && receipt.privacyAcknowledged === true &&
      Number.isFinite(Date.parse(receipt.acceptedAt))
  } catch { return false }
}

async function writeAcceptance(app, manifest) {
  const directory = app.getPath('userData')
  await fs.mkdir(directory, { recursive: true })
  const file = path.join(directory, 'agreement-acceptance.json')
  const temporary = path.join(directory, `.agreement-${randomUUID()}.tmp`)
  try {
    const handle = await fs.open(temporary, 'wx', 0o600)
    try {
      await handle.writeFile(JSON.stringify({ schemaVersion: 1, version: manifest.version, digest: manifest.digest,
        termsAccepted: true, privacyAcknowledged: true, acceptedAt: new Date().toISOString(), appVersion: app.getVersion() }, null, 2) + '\n')
      await handle.sync()
    } finally { await handle.close() }
    await fs.rename(temporary, file)
  } finally { await fs.rm(temporary, { force: true }).catch(() => {}) }
}

function focusAgreement() {
  if (!agreementWindow || agreementWindow.isDestroyed()) return false
  if (agreementWindow.isMinimized()) agreementWindow.restore()
  agreementWindow.show()
  agreementWindow.focus()
  return true
}

function openAgreement({ app, BrowserWindow, ipcMain, manifest, readOnly = false }) {
  if (focusAgreement()) return Promise.resolve(false)
  return new Promise(resolve => {
    const url = pathToFileURL(path.join(__dirname, 'agreement.html')).href
    const localWindow = new BrowserWindow({ title: 'Dragapultist Beta — Terms & Privacy', width: 840, height: 820,
      minWidth: 440, minHeight: 580, show: true, icon: path.join(__dirname, 'assets/icon.png'), backgroundColor: '#d9ebff',
      webPreferences: { preload: path.join(__dirname, 'agreement-preload.js'), contextIsolation: true,
        nodeIntegration: false, sandbox: true, partition: 'dragapultist-agreement' } })
    agreementWindow = localWindow
    const context = { app, manifest, readOnly, url, window: localWindow, resolve, accepting: false, accepted: false }
    agreementContext = context
    localWindow.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
    localWindow.webContents.session.setPermissionCheckHandler(() => false)
    localWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !details.url.startsWith('file:') })
    })
    localWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    localWindow.webContents.on('will-navigate', event => event.preventDefault())
    localWindow.webContents.on('will-redirect', event => event.preventDefault())
    localWindow.webContents.on('will-attach-webview', event => event.preventDefault())
    localWindow.on('close', event => { if (context.accepting) event.preventDefault() })
    localWindow.on('closed', () => {
      if (agreementWindow === localWindow) { agreementWindow = null; agreementContext = null }
      resolve(context.accepted)
    })
    if (!handlerInstalled) {
      handlerInstalled = true
      ipcMain.handle('agreement:request', async (event, request) => {
        const current = agreementContext
        if (!current || current.window.isDestroyed() || event.sender !== current.window.webContents ||
            event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== current.url) throw Error('Untrusted agreement request')
        if (request?.method === 'documents') return { ...current.manifest, readOnly: current.readOnly }
        if (request?.method === 'accept') {
          if (current.readOnly || current.accepting || request.choices?.termsAccepted !== true || request.choices?.privacyAcknowledged !== true) {
            throw Error('Read the documents and select both confirmations to continue.')
          }
          current.accepting = true
          try {
            await writeAcceptance(current.app, current.manifest)
            current.accepted = true
            return { accepted: true }
          } catch {
            throw Error('Your agreement could not be saved on this computer. Try again, or decline and quit.')
          } finally {
            current.accepting = false
            if (current.accepted && !current.window.isDestroyed()) current.window.close()
          }
        }
        if (request?.method === 'decline' && !current.readOnly && !current.accepting) { current.window.close(); return { accepted: false } }
        if (request?.method === 'close' && current.readOnly) { current.window.close(); return { closed: true } }
        throw Error('Unknown agreement operation')
      })
    }
    void localWindow.loadFile(path.join(__dirname, 'agreement.html')).catch(() => localWindow.close())
  })
}

async function ensureAgreement(dependencies) {
  const manifest = await loadDocuments()
  if (await readAcceptance(dependencies.app, manifest)) return { accepted: true, digest: manifest.digest }
  return { accepted: await openAgreement({ ...dependencies, manifest }), digest: manifest.digest }
}

async function showLegalDocuments(dependencies) {
  if (focusAgreement()) return
  const manifest = await loadDocuments()
  await openAgreement({ ...dependencies, manifest, readOnly: true })
}

module.exports = { ensureAgreement, showLegalDocuments, focusAgreement }
