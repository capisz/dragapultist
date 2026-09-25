const { contextBridge, ipcRenderer } = require('electron')
const invoke = (method, value) => ipcRenderer.invoke('desktop:request', { version: 1, method, value })
contextBridge.exposeInMainWorld('dragapultistDesktop', {
  version: 1,
  status: () => invoke('status'),
  configure: settings => invoke('configure', settings),
  inspect: id => invoke('inspect', { id }),
  next: () => invoke('next'),
  submit: (id, game) => invoke('submit', { id, game }),
  needsReview: (id, reason) => invoke('review', { id, reason }),
  retry: (id, username) => invoke('retry', { id, username }),
  onStatus(callback) {
    if (typeof callback !== 'function') return () => {}
    const listener = (_event, value) => callback(value)
    ipcRenderer.on('desktop:status', listener)
    return () => ipcRenderer.removeListener('desktop:status', listener)
  },
})
