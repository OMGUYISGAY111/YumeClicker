import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { BrowserWindow, app, globalShortcut, ipcMain, screen } from "electron";
//#region electron/main.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var CLICK_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class MouseOps {
    [DllImport("user32.dll")]
    static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);

    const int MOUSEEVENTF_LEFTDOWN = 0x0002;
    const int MOUSEEVENTF_LEFTUP   = 0x0004;
    const int MOUSEEVENTF_RIGHTDOWN = 0x0008;
    const int MOUSEEVENTF_RIGHTUP  = 0x0010;

    static void DoClick(int dwDown, int dwUp, int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(10);
        mouse_event(dwDown, 0, 0, 0, 0);
        mouse_event(dwUp,   0, 0, 0, 0);
    }

    public static void LeftClick(int x, int y) {
        DoClick(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, x, y);
    }

    public static void LeftDblClick(int x, int y, IntPtr hWnd) {
        DoClick(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, x, y);
        System.Threading.Thread.Sleep(50);
        DoClick(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, x, y);
        System.Threading.Thread.Sleep(10);
        SetForegroundWindow(hWnd);
    }

    public static void RightClick(int x, int y) {
        DoClick(MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, x, y);
    }
}
"@

function Click-Left([int]$x, [int]$y) {
    [MouseOps]::LeftClick($x, $y)
}
function Click-DblLeft([int]$x, [int]$y, [IntPtr]$hwnd) {
    [MouseOps]::LeftDblClick($x, $y, $hwnd)
}
function Click-Right([int]$x, [int]$y) {
    [MouseOps]::RightClick($x, $y)
}
`;
var CLICK_SCRIPT_DIR = join(tmpdir(), "yumeClicker");
var CLICK_SCRIPT_PATH = join(CLICK_SCRIPT_DIR, "click.ps1");
function ensureClickScript() {
	if (existsSync(CLICK_SCRIPT_PATH)) rmSync(CLICK_SCRIPT_PATH);
	mkdirSync(CLICK_SCRIPT_DIR, { recursive: true });
	writeFileSync(CLICK_SCRIPT_PATH, CLICK_SCRIPT, "utf-8");
}
var MAX_WIDTH = 72;
var MAX_HEIGHT = 90;
var overlay = null;
var overlayReady = false;
function createOverlay() {
	const overlayHtml = "<html style=\"cursor:none\"><body style=\"margin:0;background:transparent\"></body></html>";
	const overlayPath = join(CLICK_SCRIPT_DIR, "overlay.html");
	writeFileSync(overlayPath, overlayHtml, "utf-8");
	const { width, height } = screen.getPrimaryDisplay().size;
	overlay = new BrowserWindow({
		x: 0,
		y: 0,
		width,
		height,
		show: false,
		resizable: false,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		skipTaskbar: true,
		focusable: false,
		hasShadow: false,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	overlay.setIgnoreMouseEvents(true, { forward: true });
	overlay.loadFile(overlayPath);
	overlay.webContents.on("did-finish-load", () => {
		overlayReady = true;
	});
}
function spawnPs(psCmd, onClose) {
	const proc = spawn("powershell", [
		"-NoProfile",
		"-ExecutionPolicy",
		"Bypass",
		"-Command",
		psCmd
	], { windowsHide: true });
	proc.on("error", (err) => {
		console.error("spawn failed:", err.message);
		onClose();
	});
	proc.on("close", onClose);
}
function mouseClick(x, y, button = "left") {
	const func = button === "left" ? "Click-Left" : "Click-Right";
	if (overlay && !overlay.isDestroyed() && overlayReady) overlay.show();
	spawnPs(`. '${CLICK_SCRIPT_PATH}'; ${func} ${x} ${y}`, () => {
		if (overlay && !overlay.isDestroyed()) overlay.hide();
	});
}
function mouseDblClick(x, y, hwnd) {
	const hwndNum = hwnd.readUInt32LE(0);
	if (overlay && !overlay.isDestroyed() && overlayReady) overlay.show();
	spawnPs(`. '${CLICK_SCRIPT_PATH}'; Click-DblLeft ${x} ${y} ${hwndNum}`, () => {
		if (overlay && !overlay.isDestroyed()) overlay.hide();
	});
}
var createWindow = () => {
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
			preload: join(__dirname, "preload.js")
		}
	});
	win.setAlwaysOnTop(true, "screen-saver");
	if (process.env.NODE_ENV === "development") win.loadURL("http://localhost:5173");
	else win.loadFile("dist/index.html");
	ipcSign(win);
	win.once("closed", () => {
		if (overlay && !overlay.isDestroyed()) overlay.destroy();
	});
};
var ipcSign = (win) => {
	ipcMain.on("set-window-size", (_, w, h) => win.setSize(w, h));
	ipcMain.on("window-minimize", () => win.minimize());
	ipcMain.on("window-maximize", () => win.maximize());
	ipcMain.on("window-close", () => win.close());
	ipcMain.handle("window-get-pos", () => win.getPosition());
	ipcMain.on("window-set-pos", (_, x, y) => win.setBounds({
		x,
		y,
		width: MAX_WIDTH,
		height: MAX_HEIGHT
	}));
	ipcMain.on("mouse-click", (_, x, y, button) => {
		mouseClick(x, y, button);
	});
	ipcMain.on("mouse-dblclick", (_, x, y) => {
		mouseDblClick(x, y, win.getNativeWindowHandle());
		setTimeout(() => win.focus(), 400);
		setTimeout(() => win.focus(), 800);
	});
	ipcMain.on("window-focus", () => win.focus());
	globalShortcut.register("X", () => win.focus());
	let moveTimer = null;
	let isMoving = false;
	win.on("move", () => {
		if (!isMoving) {
			isMoving = true;
			win.webContents.send("window-move-start");
		}
		if (moveTimer) clearTimeout(moveTimer);
		moveTimer = setTimeout(() => {
			isMoving = false;
			moveTimer = null;
			win.webContents.send("window-move-stop");
		}, 120);
	});
};
app.whenReady().then(() => {
	ensureClickScript();
	createOverlay();
	createWindow();
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
export {};
