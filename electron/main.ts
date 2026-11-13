import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import chokidar, { FSWatcher } from "chokidar";
import type { FileEntry, ReadDirResult } from "./shared/types";
import { registerTagsIpc } from "./features/tags";
import { registerRecentsIpc } from "./features/recents";
import { registerHashingIpc } from "./features/hashing";
import { registerStorageIpc } from "./features/storage";
import { registerArchiveIpc } from "./features/archive";
import { registerSecurityIpc } from "./features/security";
import { registerSystemIpc } from "./features/system";
import { registerPreviewIpc } from "./features/preview";

const isDev = process.env.NODE_ENV === "development";

let mainWindow: BrowserWindow | null = null;
const watchers = new Map<string, FSWatcher>();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    titleBarOverlay:
      process.platform === "win32"
        ? { color: "#00000000", symbolColor: "#888888", height: 36 }
        : undefined,
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerTagsIpc();
  registerRecentsIpc();
  registerHashingIpc();
  registerStorageIpc();
  registerArchiveIpc();
  registerSecurityIpc();
  registerSystemIpc();
  registerPreviewIpc();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  for (const w of watchers.values()) w.close();
  watchers.clear();
  if (process.platform !== "darwin") app.quit();
});

// ---------- helpers ----------

async function toFileEntry(fullPath: string, dirent?: { name: string }): Promise<FileEntry | null> {
  try {
    const name = dirent?.name ?? path.basename(fullPath);
    const lstat = await fs.lstat(fullPath);
    const isSymlink = lstat.isSymbolicLink();
    const stat = isSymlink ? await fs.stat(fullPath).catch(() => lstat) : lstat;
    return {
      name,
      path: fullPath,
      isDirectory: stat.isDirectory(),
      isSymlink,
      size: stat.size,
      modifiedAt: stat.mtimeMs,
      createdAt: stat.birthtimeMs,
      extension: path.extname(name).replace(".", "").toLowerCase(),
      hidden: name.startsWith("."),
    };
  } catch {
    return null;
  }
}

// ---------- IPC: filesystem ----------

ipcMain.handle("fs:readDir", async (_e, dirPath: string): Promise<ReadDirResult> => {
  const dirents = await fs.readdir(dirPath, { withFileTypes: true });
  const entries = (
    await Promise.all(dirents.map((d) => toFileEntry(path.join(dirPath, d.name), d)))
  ).filter((e): e is FileEntry => e !== null);
  return { path: dirPath, entries };
});

ipcMain.handle("fs:getHome", () => os.homedir());

ipcMain.handle("fs:getQuickAccess", () => {
  const home = os.homedir();
  const common = ["Desktop", "Documents", "Downloads", "Pictures", "Music", "Videos"];
  return common.map((name) => ({ name, path: path.join(home, name) }));
});

ipcMain.handle("fs:getDrives", async () => {
  if (process.platform === "win32") {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const drives: { name: string; path: string }[] = [];
    for (const letter of letters) {
      const drivePath = `${letter}:\\`;
      try {
        await fs.stat(drivePath);
        drives.push({ name: `${letter}:`, path: drivePath });
      } catch {
        // drive not present
      }
    }
    return drives;
  }
  // macOS
  const volumesRoot = "/Volumes";
  try {
    const names = await fs.readdir(volumesRoot);
    return names.map((n) => ({ name: n, path: path.join(volumesRoot, n) }));
  } catch {
    return [{ name: "Macintosh HD", path: "/" }];
  }
});

ipcMain.handle("fs:getInfo", async (_e, targetPath: string) => toFileEntry(targetPath));

ipcMain.handle("fs:createFolder", async (_e, parentDir: string, name: string) => {
  const target = path.join(parentDir, name);
  await fs.mkdir(target, { recursive: false });
  return target;
});

ipcMain.handle("fs:createFile", async (_e, parentDir: string, name: string) => {
  const target = path.join(parentDir, name);
  await fs.writeFile(target, "", { flag: "wx" });
  return target;
});

ipcMain.handle("fs:rename", async (_e, oldPath: string, newName: string) => {
  const target = path.join(path.dirname(oldPath), newName);
  await fs.rename(oldPath, target);
  return target;
});

ipcMain.handle("fs:delete", async (_e, paths: string[]) => {
  const trashModule = await import("trash");
  await trashModule.default(paths);
});

ipcMain.handle("fs:deletePermanent", async (_e, paths: string[]) => {
  for (const p of paths) {
    await fs.rm(p, { recursive: true, force: true });
  }
});

async function copyRecursive(src: string, dest: string) {
  const stat = await fs.lstat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const children = await fs.readdir(src);
    for (const child of children) {
      await copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    await fs.copyFile(src, dest);
  }
}

function uniqueDestName(destDir: string, baseName: string): string {
  return path.join(destDir, baseName);
}

ipcMain.handle(
  "fs:copy",
  async (e, sourcePaths: string[], destDir: string, opId: string) => {
    let i = 0;
    for (const src of sourcePaths) {
      const name = path.basename(src);
      const dest = uniqueDestName(destDir, name);
      e.sender.send("fs:progress", {
        id: opId,
        op: "copy",
        current: i,
        total: sourcePaths.length,
        currentFile: name,
        done: false,
      });
      await copyRecursive(src, dest);
      i++;
    }
    e.sender.send("fs:progress", {
      id: opId,
      op: "copy",
      current: sourcePaths.length,
      total: sourcePaths.length,
      currentFile: "",
      done: true,
    });
  }
);

ipcMain.handle(
  "fs:move",
  async (e, sourcePaths: string[], destDir: string, opId: string) => {
    let i = 0;
    for (const src of sourcePaths) {
      const name = path.basename(src);
      const dest = uniqueDestName(destDir, name);
      e.sender.send("fs:progress", {
        id: opId,
        op: "move",
        current: i,
        total: sourcePaths.length,
        currentFile: name,
        done: false,
      });
      try {
        await fs.rename(src, dest);
      } catch {
        await copyRecursive(src, dest);
        await fs.rm(src, { recursive: true, force: true });
      }
      i++;
    }
    e.sender.send("fs:progress", {
      id: opId,
      op: "move",
      current: sourcePaths.length,
      total: sourcePaths.length,
      currentFile: "",
      done: true,
    });
  }
);

ipcMain.handle("fs:openPath", (_e, targetPath: string) => shell.openPath(targetPath));
ipcMain.handle("fs:showInFolder", (_e, targetPath: string) => shell.showItemInFolder(targetPath));
ipcMain.handle("fs:trashInfo", () => ({ platform: process.platform }));

// ---------- IPC: watch ----------

ipcMain.handle("fs:watch", (e, dirPath: string) => {
  if (watchers.has(dirPath)) return;
  const watcher = chokidar.watch(dirPath, {
    depth: 0,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  });
  const notify = () => {
    if (!e.sender.isDestroyed()) e.sender.send("fs:changed", dirPath);
  };
  watcher.on("add", notify).on("unlink", notify).on("addDir", notify).on("unlinkDir", notify).on("change", notify);
  watchers.set(dirPath, watcher);
});

ipcMain.handle("fs:unwatch", (_e, dirPath: string) => {
  const watcher = watchers.get(dirPath);
  if (watcher) {
    watcher.close();
    watchers.delete(dirPath);
  }
});

// ---------- IPC: native dialogs / menus ----------

interface ContextMenuItem {
  id: string;
  label: string;
  enabled?: boolean;
  type?: "separator";
  checked?: boolean;
  submenu?: ContextMenuItem[];
}

function buildMenuTemplate(
  items: ContextMenuItem[],
  resolve: (id: string | null) => void
): MenuItemConstructorOptions[] {
  return items.map((item) =>
    item.type === "separator"
      ? { type: "separator" as const }
      : item.submenu
        ? { label: item.label, submenu: buildMenuTemplate(item.submenu, resolve) }
        : {
            label: item.label,
            enabled: item.enabled ?? true,
            type: item.checked !== undefined ? ("checkbox" as const) : undefined,
            checked: item.checked,
            click: () => resolve(item.id),
          }
  );
}

ipcMain.handle("ui:contextMenu", (e, items: ContextMenuItem[]) => {
  return new Promise<string | null>((resolve) => {
    const menu = Menu.buildFromTemplate(buildMenuTemplate(items, resolve));
    menu.popup({ window: BrowserWindow.fromWebContents(e.sender) ?? undefined, callback: () => resolve(null) });
  });
});

ipcMain.handle("ui:saveDialog", async (e, defaultPath: string, filters?: { name: string; extensions: string[] }[]) => {
  const win = BrowserWindow.fromWebContents(e.sender) ?? undefined;
  const result = await dialog.showSaveDialog(win as BrowserWindow, { defaultPath, filters });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle("ui:openDirectoryDialog", async (e, defaultPath?: string) => {
  const win = BrowserWindow.fromWebContents(e.sender) ?? undefined;
  const result = await dialog.showOpenDialog(win as BrowserWindow, {
    defaultPath,
    properties: ["openDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("ui:confirmDelete", async (e, names: string[]) => {
  const win = BrowserWindow.fromWebContents(e.sender) ?? undefined;
  const message =
    names.length === 1
      ? `Move "${names[0]}" to Trash?`
      : `Move ${names.length} items to Trash?`;
  const result = await dialog.showMessageBox(win as BrowserWindow, {
    type: "warning",
    buttons: ["Cancel", "Move to Trash"],
    defaultId: 1,
    cancelId: 0,
    message,
  });
  return result.response === 1;
});
