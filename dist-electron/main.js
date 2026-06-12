import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, app, ipcMain } from "electron";
//#region electron/main.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var MAX_WIDTH = 100;
var MAX_HEIGHT = 150;
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
	win.setIgnoreMouseEvents(true, { forward: true });
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
		y
	}));
	let animating = false;
	let pendingTarget = null;
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
	const doSmoothMove = (tx, ty) => {
		animating = true;
		const [curX, curY] = win.getPosition();
		const startTime = Date.now();
		const duration = 100;
		const animate = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);
			win.setBounds({
				x: Math.round(curX + (tx - curX) * progress),
				y: Math.round(curY + (ty - curY) * progress),
				width: MAX_WIDTH,
				height: MAX_HEIGHT
			});
			if (progress < 1) setTimeout(animate, 33);
			else {
				animating = false;
				if (pendingTarget) {
					const [px, py] = pendingTarget;
					pendingTarget = null;
					doSmoothMove(px, py);
				}
			}
		};
		animate();
	};
	ipcMain.on("window-smooth-move", (_, x, y) => {
		if (animating) {
			pendingTarget = [x, y];
			return;
		}
		doSmoothMove(x, y);
	});
};
app.whenReady().then(() => {
	createWindow();
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
export {};
