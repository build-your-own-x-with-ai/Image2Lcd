import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),

  // File I/O
  readImage: (filePath: string) => ipcRenderer.invoke('file:readImage', filePath),
  writeFile: (filePath: string, data: number[] | string) => ipcRenderer.invoke('file:writeFile', filePath, data),

  // Preferences
  loadPreferences: () => ipcRenderer.invoke('preferences:load'),
  savePreferences: (preferences: any) => ipcRenderer.invoke('preferences:save', preferences)
});
