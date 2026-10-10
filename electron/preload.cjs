// Preload: satu-satunya jembatan renderer ↔ main (context isolation tetap aman).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vidlustNative', {
  isNative: true,
  ready: () => ipcRenderer.send('vidlust:ready'),
  getInfo: () => ipcRenderer.invoke('vidlust:get-info'),
  chooseDir: () => ipcRenderer.invoke('vidlust:choose-dir'),
  openDir: (dir) => ipcRenderer.invoke('vidlust:open-dir', dir),
  saveBuffer: (name, buffer) => ipcRenderer.invoke('vidlust:save-buffer', { name, buffer }),
  convertMp4: (name, buffer) => ipcRenderer.invoke('vidlust:convert-mp4', { name, buffer }),
  convertProRes: (name, buffer) => ipcRenderer.invoke('vidlust:convert-prores', { name, buffer }),
  makeGif: (name, buffer) => ipcRenderer.invoke('vidlust:make-gif', { name, buffer }),
  seqBegin: () => ipcRenderer.invoke('vidlust:seq-begin'),
  seqFrame: (jobId, index, buffer) => ipcRenderer.invoke('vidlust:seq-frame', { jobId, index, buffer }),
  seqFinish: (jobId, fps, outName) => ipcRenderer.invoke('vidlust:seq-finish', { jobId, fps, outName }),
  seqAbort: (jobId) => ipcRenderer.invoke('vidlust:seq-abort', { jobId }),
});
