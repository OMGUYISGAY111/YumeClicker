let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("win", {
	setSize: (w, h) => electron.ipcRenderer.send("set-window-size", w, h),
	minimize: () => electron.ipcRenderer.send("window-minimize"),
	maximize: () => electron.ipcRenderer.send("window-maximize"),
	close: () => electron.ipcRenderer.send("window-close"),
	getPos: () => electron.ipcRenderer.invoke("window-get-pos"),
	setPos: (x, y) => electron.ipcRenderer.send("window-set-pos", x, y),
	mouseClick: (x, y, button = "left") => electron.ipcRenderer.send("mouse-click", x, y, button),
	onMoveStart: (cb) => electron.ipcRenderer.on("window-move-start", cb),
	onMoveStop: (cb) => electron.ipcRenderer.on("window-move-stop", cb)
});
//#endregion
