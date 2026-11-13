import { ipcMain } from "electron";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { DuplicateGroup } from "../shared/types";

export function hashFileStream(filePath: string, algo = "sha1"): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algo);
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function walkFiles(root: string, out: { path: string; size: number }[], depthLimit = 12, depth = 0) {
  if (depth > depthLimit) return;
  let dirents: fs.Dirent[];
  try {
    dirents = await fsp.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const d of dirents) {
    if (d.name === "node_modules" || d.name === ".git") continue;
    const full = path.join(root, d.name);
    if (d.isDirectory()) {
      await walkFiles(full, out, depthLimit, depth + 1);
    } else if (d.isFile()) {
      try {
        const stat = await fsp.stat(full);
        out.push({ path: full, size: stat.size });
      } catch {
        // skip unreadable
      }
    }
  }
}

export function registerHashingIpc() {
  ipcMain.handle("fs:hashFile", (_e, filePath: string, algo?: string) => hashFileStream(filePath, algo));

  ipcMain.handle(
    "fs:findDuplicates",
    async (e, rootDir: string, opId: string): Promise<DuplicateGroup[]> => {
      const files: { path: string; size: number }[] = [];
      await walkFiles(rootDir, files);

      const bySize = new Map<number, { path: string; size: number }[]>();
      for (const f of files) {
        if (f.size === 0) continue;
        const arr = bySize.get(f.size) ?? [];
        arr.push(f);
        bySize.set(f.size, arr);
      }

      const candidates = Array.from(bySize.values()).filter((arr) => arr.length > 1).flat();
      const byHash = new Map<string, DuplicateGroup>();
      let processed = 0;

      for (const f of candidates) {
        try {
          const hash = await hashFileStream(f.path);
          const key = `${f.size}:${hash}`;
          const group = byHash.get(key) ?? { hash, size: f.size, paths: [] };
          group.paths.push(f.path);
          byHash.set(key, group);
        } catch {
          // skip
        }
        processed++;
        if (!e.sender.isDestroyed()) {
          e.sender.send("fs:duplicateProgress", { id: opId, processed, total: candidates.length });
        }
      }

      return Array.from(byHash.values()).filter((g) => g.paths.length > 1);
    }
  );

  ipcMain.handle("fs:verifyChecksum", async (_e, pathA: string, pathB: string) => {
    const [hashA, hashB] = await Promise.all([hashFileStream(pathA), hashFileStream(pathB)]);
    return { match: hashA === hashB, hashA, hashB };
  });
}
