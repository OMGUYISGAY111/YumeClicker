import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { app, BrowserWindow, ipcMain } from 'electron'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CLICK_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class MouseOps {
    [DllImport("user32.dll")]
    static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);

    const int MOUSEEVENTF_LEFTDOWN = 0x0002;
    const int MOUSEEVENTF_LEFTUP   = 0x0004;
    const int MOUSEEVENTF_RIGHTDOWN = 0x0008;
    const int MOUSEEVENTF_RIGHTUP  = 0x0010;

    public static void LeftClick(int x, int y) {
        mouse_event(MOUSEEVENTF_LEFTDOWN, x, y, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP,   x, y, 0, 0);
    }

    public static void RightClick(int x, int y) {
        mouse_event(MOUSEEVENTF_RIGHTDOWN, x, y, 0, 0);
        mouse_event(MOUSEEVENTF_RIGHTUP,   x, y, 0, 0);
    }
}
"@

function Click-Left([int]$x, [int]$y) {
    [MouseOps]::LeftClick($x, $y)
}
function Click-Right([int]$x, [int]$y) {
    [MouseOps]::RightClick($x, $y)
}
`

const CLICK_SCRIPT_DIR = join(tmpdir(), 'yumeClicker')
const CLICK_SCRIPT_PATH = join(CLICK_SCRIPT_DIR, 'click.ps1')

function ensureClickScript() {
  mkdirSync(CLICK_SCRIPT_DIR, { recursive: true })
  writeFileSync(CLICK_SCRIPT_PATH, CLICK_SCRIPT, 'utf-8')
}

function mouseClick(x: number, y: number, button: 'left' | 'right' = 'left') {
  const func = button === 'left' ? 'Click-Left' : 'Click-Right'
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${CLICK_SCRIPT_PATH}" ${func} ${x} ${y}`, {
    timeout: 3000,
    windowsHide: true,
  })
}

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
  ipcMain.on('mouse-click', (_, x: number, y: number, button: 'left' | 'right') => mouseClick(x, y, button))

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
  ensureClickScript()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
