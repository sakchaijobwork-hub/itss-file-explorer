import { ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { DirStatsNode } from "../shared/types";

async function buildTree(dirPath: string, depth: number, maxDepth: number): Promise<DirStatsNode> {
  const name = path.basename(dirPath) || dirPath;
  const node: DirStatsNode = { name, path: dirPath, size: 0, isDirectory: true, children: [] };

  let dirents;
  try {
    dirents = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return node;
  }

  const children: DirStatsNode[] = [];
  for (const d of dirents) {
    const full = path.join(dirPath, d.name);
    if (d.isDirectory()) {
      if (depth >= maxDepth) {
        const size = await dirSizeOnly(full);
        node.size += size;
        children.push({ name: d.name, path: full, size, isDirectory: true });
      } else {
        const child = await buildTree(full, depth + 1, maxDepth);
        node.size += child.size;
        children.push(child);
      }
    } else {
      try {
        const stat = await fs.stat(full);
        node.size += stat.size;
        children.push({ name: d.name, path: full, size: stat.size, isDirectory: false });
      } catch {
        // skip unreadable file
      }
    }
  }

  children.sort((a, b) => b.size - a.size);
  node.children = children.slice(0, 50);
  return node;
}

async function dirSizeOnly(dirPath: string): Promise<number> {
  let total = 0;
  let dirents;
  try {
    dirents = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const d of dirents) {
    const full = path.join(dirPath, d.name);
    if (d.isDirectory()) {
      total += await dirSizeOnly(full);
    } else {
      try {
        total += (await fs.stat(full)).size;
      } catch {
        // skip
      }
    }
  }
  return total;
}

export function registerStorageIpc() {
  ipcMain.handle("fs:getDirStats", async (_e, rootDir: string): Promise<DirStatsNode> => {
    return buildTree(rootDir, 0, 2);
  });
}
