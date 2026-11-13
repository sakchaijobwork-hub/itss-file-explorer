import { ipcMain, dialog, BrowserWindow } from "electron";
import { spawn, exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { GitStatusResult } from "../shared/types";

const execAsync = promisify(exec);

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
  ipcMain.handle("fs:readLinkTarget", (_e, linkPath: string) => fs.readlink(linkPath));
  ipcMain.handle("fs:createSymlink", (_e, targetPath: string, linkPath: string) => fs.symlink(targetPath, linkPath));
}
