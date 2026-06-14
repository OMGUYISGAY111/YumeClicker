import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain } from 'electron'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEBUG = 0;

const MAX_WIDTH = 24 * 3;
const MAX_HEIGHT = 30 * 3;

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

  // win.setIgnoreMouseEvents(true, { forward: true })
  win.setAlwaysOnTop(true, 'screen-saver')

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
  ipcMain.on('window-set-pos', (_, x: number, y: number) => win.setBounds({ x, y, width: MAX_WIDTH, height: MAX_HEIGHT }))
  let moveTimer: ReturnType<typeof setTimeout> | null = null
  let isMoving = false

  win.on('move', () => {
    if (!isMoving) {
      isMoving = true
      win.webContents.send('window-move-start')
    }
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = setTimeout(() => {
      isMoving = false
      moveTimer = null
      win.webContents.send('window-move-stop')
    }, 120)
  })

}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
