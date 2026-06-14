import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('win', {
  setSize: (w: number, h: number) => ipcRenderer.send('set-window-size', w, h),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getPos: (): Promise<number[]> => ipcRenderer.invoke('window-get-pos'),
  setPos: (x: number, y: number) => ipcRenderer.send('window-set-pos', x, y),
  mouseClick: (x: number, y: number, button: 'left' | 'right' = 'left') => ipcRenderer.send('mouse-click', x, y, button),
  mouseDblClick: (x: number, y: number) => ipcRenderer.send('mouse-dblclick', x, y),
  focus: () => ipcRenderer.send('window-focus'),
  onMoveStart: (cb: () => void) => ipcRenderer.on('window-move-start', cb),
  onMoveStop: (cb: () => void) => ipcRenderer.on('window-move-stop', cb),
})
