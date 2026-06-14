import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { BrowserWindow, app, ipcMain } from "electron";
//#region electron/main.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var CLICK_SCRIPT = `
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
`;
var CLICK_SCRIPT_DIR = join(tmpdir(), "yumeClicker");
var CLICK_SCRIPT_PATH = join(CLICK_SCRIPT_DIR, "click.ps1");
function ensureClickScript() {
	mkdirSync(CLICK_SCRIPT_DIR, { recursive: true });
	writeFileSync(CLICK_SCRIPT_PATH, CLICK_SCRIPT, "utf-8");
}
function mouseClick(x, y, button = "left") {
	execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${CLICK_SCRIPT_PATH}" ${button === "left" ? "Click-Left" : "Click-Right"} ${x} ${y}`, {
		timeout: 3e3,
		windowsHide: true
	});
}
var MAX_WIDTH = 72;
var MAX_HEIGHT = 90;
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
	ipcMain.on("mouse-click", (_, x, y, button) => mouseClick(x, y, button));
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
	createWindow();
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
export {};
