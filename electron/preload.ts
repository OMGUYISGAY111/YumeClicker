import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('win', {
  setSize: (w: number, h: number) => ipcRenderer.send('set-window-size', w, h),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getPos: (): Promise<number[]> => ipcRenderer.invoke('window-get-pos'),
  setPos: (x: number, y: number) => ipcRenderer.send('window-set-pos', x, y),
  smoothMove: (x: number, y: number) => ipcRenderer.send('window-smooth-move', x, y),
})
