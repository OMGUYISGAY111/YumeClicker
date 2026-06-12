import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain } from 'electron'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEBUG = 0;

const MAX_WIDTH = 100;
const MAX_HEIGHT = 150;

const createWindow = () => {
  const win = new BrowserWindow({
    width: MAX_WIDTH,
    height: MAX_HEIGHT,
    resizable: false,
    frame: false,
    transparent: true,
    minWidth: MAX_WIDTH,
    maxWidth: MAX_WIDTH,
    minHeight: MAX_HEIGHT,
    maxHeight: MAX_HEIGHT,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    if(DEBUG) win.webContents.openDevTools();
  } else {
    win.loadFile('dist/index.html')
  }

  ipcSign(win)
}

const ipcSign = (win: BrowserWindow) => {
  ipcMain.on('set-window-size', (_, w: number, h: number) => win.setSize(w, h))
  ipcMain.on('window-minimize', () => win.minimize())
  ipcMain.on('window-maximize', () => win.maximize())
  ipcMain.on('window-close', () => win.close())
  ipcMain.handle('window-get-pos', () => win.getPosition())
  ipcMain.on('window-set-pos', (_, x: number, y: number) => win.setBounds({ x, y }))
  let animating = false

  ipcMain.on('window-smooth-move', (_, x: number, y: number) => {
    if (animating) return
    animating = true

    const [curX, curY] = win.getPosition()
    const startTime = Date.now()
    const duration = 100

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      win.setBounds({
        x: Math.round(curX + (x - curX) * progress),
        y: Math.round(curY + (y - curY) * progress),
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
      })
      if (progress < 1) {
        setTimeout(animate, 33)
      } else {
        animating = false
      }
    }
    animate()
  })
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
