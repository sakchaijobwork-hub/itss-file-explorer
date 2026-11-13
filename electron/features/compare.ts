import { ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { CompareResult } from "../shared/types";

async function walkRelative(root: string, base = ""): Promise<Map<string, { size: number; mtime: number }>> {
  const result = new Map<string, { size: number; mtime: number }>();
  async function walk(dir: string, rel: string) {
    let dirents;
    try {
      dirents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of dirents) {
      if (d.name === "node_modules" || d.name === ".git") continue;
      const relPath = rel ? `${rel}/${d.name}` : d.name;
      const fullPath = path.join(dir, d.name);
      if (d.isDirectory()) {
        await walk(fullPath, relPath);
      } else {
        try {
          const stat = await fs.stat(fullPath);
          result.set(relPath, { size: stat.size, mtime: Math.floor(stat.mtimeMs / 1000) });
        } catch {
          // skip
        }
      }
    }
  }
  await walk(root, base);
  return result;
}

async function compareDirs(pathA: string, pathB: string): Promise<CompareResult> {
  const [left, right] = await Promise.all([walkRelative(pathA), walkRelative(pathB)]);
  const onlyLeft: string[] = [];
  const onlyRight: string[] = [];
  const different: string[] = [];
  const same: string[] = [];

  for (const [relPath, info] of left) {
    const other = right.get(relPath);
    if (!other) {
      onlyLeft.push(relPath);
    } else if (other.size !== info.size) {
      different.push(relPath);
    } else {
      same.push(relPath);
    }
  }
  for (const relPath of right.keys()) {
    if (!left.has(relPath)) onlyRight.push(relPath);
  }

  return { onlyLeft, onlyRight, different, same };
}

export function registerCompareIpc() {
  ipcMain.handle("fs:compareDirs", (_e, pathA: string, pathB: string) => compareDirs(pathA, pathB));
}
