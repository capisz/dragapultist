// electron/main.js
const { app, BrowserWindow, clipboard } = require("electron")
const path = require("path")
const fs = require("fs/promises")
const chokidar = require("chokidar")

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const url = process.env.DRAGAPULTIST_URL || "http://localhost:3000"
  console.log("Loading Dragapultist URL:", url)

  mainWindow.loadURL(url)

  mainWindow.webContents.openDevTools({ mode: "detach" })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Heuristic: does this text look like a Pokémon TCG Live game log?
function looksLikeGameLog(text) {
  if (!text || text.length < 200) return false

  const markers = [
    "chose",
    "for the opening coin flip",
    "won the coin toss",
    "drew",
    "Turn #",
  ]

  return markers.every((m) => text.includes(m))
}

async function handleLogText(source, text) {
  if (!looksLikeGameLog(text)) return

  console.log(
    `Electron: detected Pokémon TCG Live log from ${source}, length=${text.length}`,
  )

  if (mainWindow) {
    mainWindow.webContents.send("log-detected", text)
  }
}

// --- CLIPBOARD WATCHER ---

function startClipboardWatcher() {
  console.log("Starting clipboard watcher...")
  let lastText = ""

  setInterval(async () => {
    const text = clipboard.readText()

    if (!text || text === lastText) return
    lastText = text

    await handleLogText("clipboard", text)
  }, 1000) // check once per second
}

// --- LOG FOLDER WATCHER (optional bonus) ---

function startLogWatcher() {
  const logsDir =
    process.env.TCG_LOG_DIR ||
    path.join(app.getPath("documents"), "PokemonTCGLive", "Logs")

  console.log("Watching logs in:", logsDir)

  const watcher = chokidar.watch(logsDir, {
    persistent: true,
    ignoreInitial: false,
    depth: 0,
  })

  watcher.on("add", (filePath) => handleLogFile("add", filePath))
  watcher.on("change", (filePath) => handleLogFile("change", filePath))
}

async function handleLogFile(eventType, filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8")
    await handleLogText(`file:${eventType}:${path.basename(filePath)}`, content)
  } catch (err) {
    console.error("Failed to read log file:", filePath, err)
  }
}

app.whenReady().then(() => {
  createWindow()
  startClipboardWatcher() // <— the important one for copy/paste
  startLogWatcher()       // <— optional, you already saw "Watching logs in: ..."

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
