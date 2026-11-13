import { ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { TrashItem } from "../shared/types";

// ---------- macOS ----------

function macTrashDir() {
  return path.join(os.homedir(), ".Trash");
}

async function macList(): Promise<TrashItem[]> {
  const dir = macTrashDir();
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const items: TrashItem[] = [];
  for (const name of names) {
    try {
      const full = path.join(dir, name);
      const stat = await fs.lstat(full);
      items.push({
        id: full,
        name,
        size: stat.size,
        deletedAt: stat.mtimeMs,
        originalPath: null,
        isDirectory: stat.isDirectory(),
      });
    } catch {
      // skip unreadable entry
    }
  }
  return items;
}

async function macRestore(id: string, destPath: string) {
  try {
    await fs.rename(id, destPath);
  } catch {
    await fs.cp(id, destPath, { recursive: true });
    await fs.rm(id, { recursive: true, force: true });
  }
}

async function macDeleteForever(id: string) {
  await fs.rm(id, { recursive: true, force: true });
}

// ---------- Linux (XDG trash spec) ----------

function linuxTrashDirs() {
  const base = path.join(os.homedir(), ".local", "share", "Trash");
  return { files: path.join(base, "files"), info: path.join(base, "info") };
}

async function linuxList(): Promise<TrashItem[]> {
  const { files, info } = linuxTrashDirs();
  let names: string[];
  try {
    names = await fs.readdir(files);
  } catch {
    return [];
  }
  const items: TrashItem[] = [];
  for (const name of names) {
    try {
      const full = path.join(files, name);
      const stat = await fs.lstat(full);
      let originalPath: string | null = null;
      let deletedAt: number | null = stat.mtimeMs;
      try {
        const infoText = await fs.readFile(path.join(info, `${name}.trashinfo`), "utf8");
        const pathMatch = infoText.match(/^Path=(.*)$/m);
        const dateMatch = infoText.match(/^DeletionDate=(.*)$/m);
        if (pathMatch) originalPath = decodeURIComponent(pathMatch[1].trim());
        if (dateMatch) {
          const t = Date.parse(dateMatch[1].trim());
          if (!Number.isNaN(t)) deletedAt = t;
        }
      } catch {
        // info file missing — restore destination will need to be chosen manually
      }
      items.push({ id: full, name, size: stat.size, deletedAt, originalPath, isDirectory: stat.isDirectory() });
    } catch {
      // skip unreadable entry
    }
  }
  return items;
}

async function linuxRestore(id: string, destPath: string) {
  const { info } = linuxTrashDirs();
  const name = path.basename(id);
  try {
    await fs.rename(id, destPath);
  } catch {
    await fs.cp(id, destPath, { recursive: true });
    await fs.rm(id, { recursive: true, force: true });
  }
  await fs.rm(path.join(info, `${name}.trashinfo`), { force: true });
}

async function linuxDeleteForever(id: string) {
  const { info } = linuxTrashDirs();
  const name = path.basename(id);
  await fs.rm(id, { recursive: true, force: true });
  await fs.rm(path.join(info, `${name}.trashinfo`), { force: true });
}

// ---------- Windows ($Recycle.Bin, best-effort parser for the Windows 10/11 $I format) ----------

function windowsRecycleBinRoot(): string {
  return "C:\\$Recycle.Bin";
}

function parseWindowsFiletime(low: bigint): number | null {
  // FILETIME: 100ns intervals since 1601-01-01. Convert to a JS epoch ms timestamp.
  if (low <= 0n) return null;
  const EPOCH_DIFF = 116444736000000000n; // 1601-01-01 -> 1970-01-01, in 100ns units
  const ms = (low - EPOCH_DIFF) / 10000n;
  const num = Number(ms);
  return Number.isFinite(num) && num > 0 ? num : null;
}

async function parseIFile(iPath: string): Promise<{ size: number; deletedAt: number | null; originalPath: string | null }> {
  const buf = await fs.readFile(iPath);
  if (buf.length < 24) return { size: 0, deletedAt: null, originalPath: null };

  const size = Number(buf.readBigInt64LE(8));
  const deletedAt = parseWindowsFiletime(buf.readBigInt64LE(16));

  let originalPath: string | null = null;
  try {
    const version = buf.readBigInt64LE(0);
    if (version >= 2n && buf.length >= 28) {
      const pathLenUnits = buf.readInt32LE(24);
      const byteLen = pathLenUnits * 2;
      const pathBuf = buf.subarray(28, 28 + byteLen);
      originalPath = pathBuf.toString("utf16le").replace(/\0+$/, "");
    } else {
      // Version 1 (legacy): fixed-width UTF-16 path starting at offset 24.
      originalPath = buf.subarray(24).toString("utf16le").replace(/\0+$/, "");
    }
  } catch {
    originalPath = null;
  }

  return { size, deletedAt, originalPath };
}

async function windowsList(): Promise<TrashItem[]> {
  const root = windowsRecycleBinRoot();
  let sidDirs: string[];
  try {
    sidDirs = await fs.readdir(root);
  } catch {
    return [];
  }
  const items: TrashItem[] = [];
  for (const sid of sidDirs) {
    const sidPath = path.join(root, sid);
    let entries: string[];
    try {
      entries = await fs.readdir(sidPath);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.startsWith("$I")) continue;
      const suffix = entry.slice(2);
      const iPath = path.join(sidPath, entry);
      const rPath = path.join(sidPath, `$R${suffix}`);
      if (!fsSync.existsSync(rPath)) continue;
      try {
        const meta = await parseIFile(iPath);
        const rStat = await fs.lstat(rPath);
        items.push({
          id: rPath,
          name: meta.originalPath ? path.basename(meta.originalPath) : path.basename(rPath),
          size: meta.size || rStat.size,
          deletedAt: meta.deletedAt,
          originalPath: meta.originalPath,
          isDirectory: rStat.isDirectory(),
        });
      } catch {
        // skip unreadable pair
      }
    }
  }
  return items;
}

async function windowsRestore(id: string, destPath: string) {
  const iPath = path.join(path.dirname(id), `$I${path.basename(id).slice(2)}`);
  try {
    await fs.rename(id, destPath);
  } catch {
    await fs.cp(id, destPath, { recursive: true });
    await fs.rm(id, { recursive: true, force: true });
  }
  await fs.rm(iPath, { force: true });
}

async function windowsDeleteForever(id: string) {
  const iPath = path.join(path.dirname(id), `$I${path.basename(id).slice(2)}`);
  await fs.rm(id, { recursive: true, force: true });
  await fs.rm(iPath, { force: true });
}

// ---------- dispatch ----------

async function listTrash(): Promise<TrashItem[]> {
  if (process.platform === "darwin") return macList();
  if (process.platform === "win32") return windowsList();
  return linuxList();
}

async function restoreTrashItem(id: string, destPath: string) {
  if (process.platform === "darwin") return macRestore(id, destPath);
  if (process.platform === "win32") return windowsRestore(id, destPath);
  return linuxRestore(id, destPath);
}

async function deleteTrashItemForever(id: string) {
  if (process.platform === "darwin") return macDeleteForever(id);
  if (process.platform === "win32") return windowsDeleteForever(id);
  return linuxDeleteForever(id);
}

export function registerTrashIpc() {
  ipcMain.handle("trash:list", () => listTrash());
  ipcMain.handle("trash:restore", (_e, id: string, destPath: string) => restoreTrashItem(id, destPath));
  ipcMain.handle("trash:deleteForever", (_e, id: string) => deleteTrashItemForever(id));
}
