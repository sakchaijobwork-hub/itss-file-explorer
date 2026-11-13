import { app, BrowserWindow, ipcMain, shell, Menu, dialog, nativeImage } from "electron";
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
import { registerRemoteIpc } from "./features/remote";
import { registerImagesIpc } from "./features/images";
import { registerSplitMergeIpc } from "./features/splitMerge";
import { registerShareIpc } from "./features/share";
import { registerNotesIpc } from "./features/notes";
import { registerAutomationIpc } from "./features/automation";
import { registerPluginsIpc } from "./features/plugins";
import { registerCompareIpc } from "./features/compare";
import { registerOfficeIpc } from "./features/office";
import { registerFavoritesIpc } from "./features/favorites";
import { registerSearchIpc } from "./features/search";
import { loadWindowState, trackWindowState } from "./features/windowState";

const isDev = process.env.NODE_ENV === "development";

const windows = new Set<BrowserWindow>();
const watchers = new Map<string, FSWatcher>();

function getTargetWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? Array.from(windows)[0];
}

function createWindow() {
  const isFirstWindow = windows.size === 0;
  const savedState = isFirstWindow ? loadWindowState() : null;

  const win = new BrowserWindow({
    width: savedState?.width ?? 1280,
    height: savedState?.height ?? 800,
    x: savedState?.x,
    y: savedState?.y,
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

  windows.add(win);

  if (isFirstWindow) {
    if (savedState?.isMaximized) win.maximize();
    trackWindowState(win);
  }

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.on("closed", () => {
    windows.delete(win);
  });

  return win;
}

function sendMenuAction(action: string) {
  const win = getTargetWindow();
  win?.webContents.send("menu:action", action);
}

function buildAppMenu() {
  const isMac = process.platform === "darwin";

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        { label: "New Window", accelerator: "CmdOrCtrl+N", click: () => createWindow() },
        { label: "New Tab", accelerator: "CmdOrCtrl+T", click: () => sendMenuAction("new-tab") },
        { label: "New Folder", accelerator: "CmdOrCtrl+Shift+N", click: () => sendMenuAction("new-folder") },
        { label: "New File", click: () => sendMenuAction("new-file") },
        { type: "separator" },
        { label: "Open Terminal Here", click: () => sendMenuAction("open-terminal") },
        { label: "Connect to Remote…", click: () => sendMenuAction("connect-remote") },
        { label: "Compare / Sync Folders…", click: () => sendMenuAction("compare-folders") },
        { type: "separator" },
        isMac ? { role: "close" as const } : { label: "Close Window", accelerator: "CmdOrCtrl+W", role: "close" as const },
      ],
    },
    {
      label: "Edit",
      submenu: [
        // "Undo" is intentionally app-level (last file operation), not text-edit undo —
        // matches Finder/Explorer convention, so no role: "undo"/"redo" here.
        { label: "Undo", accelerator: "CmdOrCtrl+Z", click: () => sendMenuAction("undo") },
        { label: "Redo", accelerator: "CmdOrCtrl+Shift+Z", click: () => sendMenuAction("redo") },
        { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
        { type: "separator" },
        { label: "Search File Contents…", accelerator: "CmdOrCtrl+Shift+F", click: () => sendMenuAction("content-search") },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "as Grid", click: () => sendMenuAction("view-grid") },
        { label: "as List", click: () => sendMenuAction("view-list") },
        { label: "as Details", click: () => sendMenuAction("view-details") },
        { label: "as Columns", click: () => sendMenuAction("view-columns") },
        { type: "separator" },
        { label: "Zoom In", accelerator: "CmdOrCtrl+=", click: () => sendMenuAction("zoom-in") },
        { label: "Zoom Out", accelerator: "CmdOrCtrl+-", click: () => sendMenuAction("zoom-out") },
        { type: "separator" },
        { label: "Show Hidden Files", accelerator: "CmdOrCtrl+Shift+.", click: () => sendMenuAction("toggle-hidden") },
        { label: "Toggle Preview Panel", click: () => sendMenuAction("toggle-preview") },
        { label: "Toggle Dual Pane", click: () => sendMenuAction("toggle-dualpane") },
        { label: "Toggle Theme", click: () => sendMenuAction("toggle-theme") },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Go",
      submenu: [
        { label: "Back", accelerator: "CmdOrCtrl+[", click: () => sendMenuAction("go-back") },
        { label: "Forward", accelerator: "CmdOrCtrl+]", click: () => sendMenuAction("go-forward") },
        { label: "Up", accelerator: "CmdOrCtrl+Up", click: () => sendMenuAction("go-up") },
        { label: "Go to Folder…", accelerator: "CmdOrCtrl+L", click: () => sendMenuAction("go-to-folder") },
      ],
    },
    {
      label: "Tools",
      submenu: [
        { label: "Find Duplicate Files…", click: () => sendMenuAction("find-duplicates") },
        { label: "Analyze Storage…", click: () => sendMenuAction("analyze-storage") },
        { label: "Batch Rename…", click: () => sendMenuAction("batch-rename") },
        { label: "Recent Files…", click: () => sendMenuAction("recent-files") },
        { type: "separator" },
        { label: "Folder Automation Rules…", click: () => sendMenuAction("automation") },
        { label: "Plugins…", click: () => sendMenuAction("plugins") },
        { type: "separator" },
        { label: "Settings…", accelerator: "CmdOrCtrl+,", click: () => sendMenuAction("settings") },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, ...(isMac ? [{ role: "front" as const }] : [{ role: "close" as const }])],
    },
    {
      label: "Help",
      submenu: [
        { label: "Keyboard Shortcuts", click: () => sendMenuAction("shortcuts-help") },
        { label: "About ITSS File Explorer", click: () => sendMenuAction("about") },
      ],
    },
  ];

  // On Windows/Linux the window already has a fully custom chrome (frameless,
  // own tab bar + toolbar replicating every action here), so a native menu
  // bar would just duplicate it and eat window space. macOS's menu bar lives
  // in the system bar (no window space cost) and some Edit roles (cut/copy/
  // paste/selectAll) are required there for those shortcuts to work in text
  // fields at all, so we keep it only on macOS; the same actions remain
  // reachable via the Command Palette and the in-app keyboard shortcuts on
  // every platform.
  Menu.setApplicationMenu(isMac ? Menu.buildFromTemplate(template) : null);
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
  registerRemoteIpc();
  registerImagesIpc();
  registerSplitMergeIpc();
  registerShareIpc();
  registerNotesIpc();
  registerAutomationIpc();
  registerPluginsIpc();
  registerCompareIpc();
  registerOfficeIpc();
  registerFavoritesIpc();
  registerSearchIpc();

  buildAppMenu();
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

const dragIconPath = path.join(app.getAppPath(), "electron/assets/drag-icon.png");

ipcMain.on("fs:startDrag", (e, filePaths: string[]) => {
  if (filePaths.length === 0) return;
  const icon = nativeImage.createFromPath(dragIconPath);
  e.sender.startDrag({ file: filePaths[0], files: filePaths, icon });
});

ipcMain.handle("system:newWindow", () => createWindow());

ipcMain.handle("fs:getDiskSpace", async (_e, targetPath: string) => {
  const stat = await fs.statfs(targetPath);
  const total = stat.blocks * stat.bsize;
  const free = stat.bfree * stat.bsize;
  return { total, free, used: total - free };
});

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
