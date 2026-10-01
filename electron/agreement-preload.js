const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('dragapultistAgreement', {
  documents: () => ipcRenderer.invoke('agreement:request', { method: 'documents' }),
  accept: choices => ipcRenderer.invoke('agreement:request', { method: 'accept', choices }),
  decline: () => ipcRenderer.invoke('agreement:request', { method: 'decline' }),
  close: () => ipcRenderer.invoke('agreement:request', { method: 'close' }),
})
