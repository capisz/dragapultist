// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("dragapultist", {
  /**
   * Subscribe to logs detected by Electron.
   * Usage in React:
   *   window.dragapultist?.onLogDetected?.((logText) => { ... })
   */
  onLogDetected(callback) {
    if (typeof callback !== "function") {
      return () => {}
    }

    const listener = (_event, logText) => {
      callback(logText)
    }

    ipcRenderer.on("log-detected", listener)

    // allow React to unsubscribe on unmount
    return () => {
      ipcRenderer.removeListener("log-detected", listener)
    }
  },
})
