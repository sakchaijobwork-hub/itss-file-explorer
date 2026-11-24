import { ipcMain, dialog, BrowserWindow, app, nativeImage } from "electron";
import { spawn, exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import type { GitStatusResult } from "../shared/types";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface OpenWithApp {
  path: string;
  name: string;
}

export interface OpenWithAppsResult {
  apps: OpenWithApp[];
  parallelsApps: OpenWithApp[];
}

interface ScannedApp extends OpenWithApp {
  extensions: Set<string>;
  iconPath: string | null;
}

let appScanPromise: Promise<ScannedApp[]> | null = null;
let parallelsScanPromise: Promise<(OpenWithApp & { iconPath: string | null })[]> | null = null;
const appIconCache = new Map<string, Electron.NativeImage>();

async function scanAppDir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name.endsWith(".app"))
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

async function resolveIconPath(appPath: string, info: Record<string, unknown>): Promise<string | null> {
  const iconFile = (info.CFBundleIconFile || info.CFBundleIconName) as string | undefined;
  if (!iconFile) return null;
  const fileName = iconFile.endsWith(".icns") ? iconFile : `${iconFile}.icns`;
  const iconPath = path.join(appPath, "Contents", "Resources", fileName);
  try {
    await fs.access(iconPath);
    return iconPath;
  } catch {
    return null;
  }
}

async function readAppInfo(appPath: string): Promise<ScannedApp | null> {
  try {
    const plistPath = path.join(appPath, "Contents", "Info.plist");
    const { stdout } = await execFileAsync("plutil", ["-convert", "json", "-o", "-", plistPath]);
    const info = JSON.parse(stdout);
    const name: string = info.CFBundleDisplayName || info.CFBundleName || path.basename(appPath, ".app");
    const docTypes = Array.isArray(info.CFBundleDocumentTypes) ? info.CFBundleDocumentTypes : [];
    const extensions = new Set<string>();
    for (const docType of docTypes) {
      const exts = Array.isArray(docType.CFBundleTypeExtensions) ? docType.CFBundleTypeExtensions : [];
      for (const ext of exts) {
        if (typeof ext === "string" && ext !== "*") extensions.add(ext.toLowerCase());
      }
    }
    if (extensions.size === 0) return null;
    const iconPath = await resolveIconPath(appPath, info);
    return { path: appPath, name, extensions, iconPath };
  } catch {
    return null;
  }
}

async function scanInstalledApps(): Promise<ScannedApp[]> {
  const dirs = [
    "/Applications",
    "/System/Applications",
    path.join(app.getPath("home"), "Applications"),
  ];
  const appPaths = (await Promise.all(dirs.map(scanAppDir))).flat();
  const apps = await Promise.all(appPaths.map(readAppInfo));
  return apps.filter((a): a is ScannedApp => a !== null);
}

async function getInstalledApps(): Promise<ScannedApp[]> {
  if (!appScanPromise) appScanPromise = scanInstalledApps();
  return appScanPromise;
}

async function resolveLocalizedAppName(appPath: string): Promise<string | null> {
  const resourcesDir = path.join(appPath, "Contents", "Resources");
  let lprojDirs: string[];
  try {
    const entries = await fs.readdir(resourcesDir, { withFileTypes: true });
    lprojDirs = entries.filter((e) => e.isDirectory() && e.name.endsWith(".lproj")).map((e) => e.name);
  } catch {
    return null;
  }
  // Parallels' Windows app stubs put InfoPlist.strings directly in Resources/,
  // not nested under an .lproj folder like a normal macOS bundle.
  const candidates = [
    path.join(resourcesDir, "InfoPlist.strings"),
    ...["en.lproj", "Base.lproj", ...lprojDirs]
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((lproj) => path.join(resourcesDir, lproj, "InfoPlist.strings")),
  ];
  for (const stringsPath of candidates) {
    try {
      const { stdout } = await execFileAsync("plutil", ["-convert", "json", "-o", "-", stringsPath]);
      const data = JSON.parse(stdout);
      if (typeof data.CFBundleName === "string" && data.CFBundleName) return data.CFBundleName;
    } catch {
      continue;
    }
  }
  return null;
}

// Parallels Desktop exposes Windows apps as macOS .app stubs under
// "~/Applications (Parallels)/<hash> Applications.localized/<hash>.app".
// Their Info.plist declares a wildcard document-type ("*"), since the real
// file association lives in the Windows registry, not in the plist — so
// unlike regular Mac apps these can't be filtered by file extension here.
async function scanParallelsApps(): Promise<(OpenWithApp & { iconPath: string | null })[]> {
  const base = path.join(app.getPath("home"), "Applications (Parallels)");
  let groupDirs: string[];
  try {
    const entries = await fs.readdir(base, { withFileTypes: true });
    groupDirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(base, e.name));
  } catch {
    return [];
  }
  const appPaths = (await Promise.all(groupDirs.map(scanAppDir))).flat();
  const apps = await Promise.all(
    appPaths.map(async (appPath) => {
      const name = await resolveLocalizedAppName(appPath);
      if (!name) return null;
      let iconPath: string | null = null;
      try {
        const plistPath = path.join(appPath, "Contents", "Info.plist");
        const { stdout } = await execFileAsync("plutil", ["-convert", "json", "-o", "-", plistPath]);
        iconPath = await resolveIconPath(appPath, JSON.parse(stdout));
      } catch {
        // no icon, fine
      }
      return { path: appPath, name, iconPath };
    })
  );
  return apps.filter((a): a is OpenWithApp & { iconPath: string | null } => a !== null).sort((a, b) => a.name.localeCompare(b.name));
}

async function getParallelsApps(): Promise<(OpenWithApp & { iconPath: string | null })[]> {
  if (!parallelsScanPromise) parallelsScanPromise = scanParallelsApps();
  return parallelsScanPromise;
}

async function listOpenWithApps(filePath: string): Promise<OpenWithAppsResult> {
  if (process.platform !== "darwin") return { apps: [], parallelsApps: [] };
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!ext) return { apps: [], parallelsApps: [] };
  const [installed, parallels] = await Promise.all([getInstalledApps(), getParallelsApps()]);
  const matched = installed.filter((a) => a.extensions.has(ext)).sort((a, b) => a.name.localeCompare(b.name));
  await Promise.all([...matched, ...parallels].map((a) => getOpenWithAppIcon(a.path, a.iconPath)));
  return {
    apps: matched.map((a) => ({ path: a.path, name: a.name })),
    parallelsApps: parallels,
  };
}

function openWithApp(filePath: string, appPath: string) {
  spawn("open", ["-a", appPath, filePath], { detached: true, stdio: "ignore" }).unref();
}

// app.getFileIcon() returns a generic blank-document placeholder for .app
// bundles rather than the bundle's actual icon, so the real icon is read
// from the .app's own .icns resource instead, converted to a small PNG via
// `sips` (nativeImage.createFromPath can't load .icns directly) and resized
// to 16x16 — the correct 1x size for a native macOS menu item icon;
// pre-sizing matters because the native menu does not scale icons itself.
export async function getOpenWithAppIcon(
  appPath: string,
  iconPath: string | null
): Promise<Electron.NativeImage | undefined> {
  const cached = appIconCache.get(appPath);
  if (cached) return cached;
  if (iconPath) {
    const tmpPng = path.join(os.tmpdir(), `itss-openwith-${crypto.createHash("md5").update(appPath).digest("hex")}.png`);
    try {
      await execFileAsync("sips", ["-s", "format", "png", "-z", "16", "16", iconPath, "--out", tmpPng]);
      const icon = nativeImage.createFromPath(tmpPng);
      fs.unlink(tmpPng).catch(() => {});
      if (!icon.isEmpty()) {
        appIconCache.set(appPath, icon);
        return icon;
      }
    } catch {
      // fall through to the generic icon
    }
  }
  try {
    const icon = await app.getFileIcon(appPath, { size: "small" });
    appIconCache.set(appPath, icon);
    return icon;
  } catch {
    return undefined;
  }
}

export function getCachedOpenWithAppIcon(appPath: string): Electron.NativeImage | undefined {
  return appIconCache.get(appPath);
}

function openTerminal(dirPath: string) {
  if (process.platform === "darwin") {
    spawn("open", ["-a", "Terminal", dirPath], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "win32") {
    spawn("cmd.exe", ["/c", "start", "cmd.exe"], { cwd: dirPath, detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("x-terminal-emulator", [], { cwd: dirPath, detached: true, stdio: "ignore" }).unref();
  }
}

async function findGitRoot(startDir: string): Promise<string | null> {
  let dir = startDir;
  for (let i = 0; i < 25; i++) {
    try {
      const stat = await fs.stat(path.join(dir, ".git"));
      if (stat.isDirectory() || stat.isFile()) return dir;
    } catch {
      // not here
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function getGitStatus(dirPath: string): Promise<GitStatusResult> {
  const root = await findGitRoot(dirPath);
  if (!root) return { isRepo: false, files: [] };

  try {
    const [statusResult, branchResult] = await Promise.all([
      execAsync("git status --porcelain=v1", { cwd: dirPath }),
      execAsync("git rev-parse --abbrev-ref HEAD", { cwd: dirPath }),
    ]);
    const files = statusResult.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => ({ status: line.slice(0, 2).trim(), path: path.join(root, line.slice(3)) }));
    return { isRepo: true, branch: branchResult.stdout.trim(), files };
  } catch {
    return { isRepo: true, files: [] };
  }
}

async function openWith(e: Electron.IpcMainInvokeEvent, filePath: string): Promise<boolean> {
  const win = BrowserWindow.fromWebContents(e.sender) ?? undefined;
  if (process.platform === "darwin") {
    const result = await dialog.showOpenDialog(win as BrowserWindow, {
      title: "Choose Application",
      defaultPath: "/Applications",
      properties: ["openFile"],
      filters: [{ name: "Applications", extensions: ["app"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return false;
    spawn("open", ["-a", result.filePaths[0], filePath], { detached: true, stdio: "ignore" }).unref();
    return true;
  }
  if (process.platform === "win32") {
    const result = await dialog.showOpenDialog(win as BrowserWindow, {
      title: "Choose Application",
      properties: ["openFile"],
      filters: [{ name: "Executable", extensions: ["exe"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return false;
    spawn(result.filePaths[0], [filePath], { detached: true, stdio: "ignore" }).unref();
    return true;
  }
  const result = await dialog.showOpenDialog(win as BrowserWindow, { title: "Choose Application", properties: ["openFile"] });
  if (result.canceled || result.filePaths.length === 0) return false;
  spawn(result.filePaths[0], [filePath], { detached: true, stdio: "ignore" }).unref();
  return true;
}

export function registerSystemIpc() {
  ipcMain.handle("system:openTerminal", (_e, dirPath: string) => openTerminal(dirPath));
  ipcMain.handle("system:getGitStatus", (_e, dirPath: string) => getGitStatus(dirPath));
  ipcMain.handle("system:openWith", (e, filePath: string) => openWith(e, filePath));
  ipcMain.handle("system:listOpenWithApps", (_e, filePath: string) => listOpenWithApps(filePath));
  ipcMain.handle("system:openWithApp", (_e, filePath: string, appPath: string) => openWithApp(filePath, appPath));
  ipcMain.handle("fs:readLinkTarget", (_e, linkPath: string) => fs.readlink(linkPath));
  ipcMain.handle("fs:createSymlink", (_e, targetPath: string, linkPath: string) => fs.symlink(targetPath, linkPath));
}
