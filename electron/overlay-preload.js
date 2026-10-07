const { contextBridge, ipcRenderer } = require('electron')
const invoke = (method, value) => ipcRenderer.invoke('overlay:request', { version: 1, method, value })
contextBridge.exposeInMainWorld('dragapultistOverlay', {
  state: () => invoke('state'),
  lock: () => invoke('lock'),
  hide: () => invoke('hide'),
  selectDeck: key => invoke('select', key),
  resize: height => invoke('resize', height),
  onState(callback) {
    if (typeof callback !== 'function') return () => {}
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('overlay:state', listener)
    return () => ipcRenderer.removeListener('overlay:state', listener)
  },
})
