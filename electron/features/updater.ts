import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

export type UpdateStatus =
  | { state: "checking" }
  | { state: "available"; version: string }
  | { state: "not-available" }
  | { state: "downloading"; percent: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string };

function broadcast(status: UpdateStatus) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("updater:status", status);
  }
}

export function registerUpdaterIpc() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => broadcast({ state: "checking" }));
  autoUpdater.on("update-available", (info) => broadcast({ state: "available", version: info.version }));
  autoUpdater.on("update-not-available", () => broadcast({ state: "not-available" }));
  autoUpdater.on("download-progress", (p) => broadcast({ state: "downloading", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", (info) => broadcast({ state: "downloaded", version: info.version }));
  autoUpdater.on("error", (err) => broadcast({ state: "error", message: err.message }));

  ipcMain.handle("updater:check", () => autoUpdater.checkForUpdates().catch((err) => broadcast({ state: "error", message: err.message })));
  ipcMain.handle("updater:download", () => autoUpdater.downloadUpdate().catch((err) => broadcast({ state: "error", message: err.message })));
  ipcMain.handle("updater:install", () => autoUpdater.quitAndInstall());
  ipcMain.handle("updater:getCurrentVersion", () => app.getVersion());

  // Check once on startup (production only — dev builds have no packaged feed).
  if (app.isPackaged) {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => undefined), 3000);
  }
}
