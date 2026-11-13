import { ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ContentSearchResult } from "../shared/types";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILES_SCANNED = 3000;
const MAX_RESULTS = 200;
const SKIP_DIRS = new Set(["node_modules", ".git", ".svn", "__pycache__"]);
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "icns",
  "mp3", "wav", "flac", "aac", "m4a", "mp4", "mov", "mkv", "avi", "webm",
  "zip", "rar", "7z", "tar", "gz", "exe", "dll", "dmg", "pkg", "app",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
]);

function isLikelyBinary(buf: Buffer): boolean {
  const len = Math.min(buf.length, 4000);
  for (let i = 0; i < len; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

async function searchContent(
  rootDir: string,
  query: string,
  opId: string,
  sender: Electron.WebContents
): Promise<ContentSearchResult[]> {
  const results: ContentSearchResult[] = [];
  const lowerQuery = query.toLowerCase();
  let scanned = 0;

  async function walk(dir: string) {
    if (results.length >= MAX_RESULTS || scanned >= MAX_FILES_SCANNED) return;
    let dirents;
    try {
      dirents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of dirents) {
      if (results.length >= MAX_RESULTS || scanned >= MAX_FILES_SCANNED) return;
      if (SKIP_DIRS.has(d.name)) continue;
      const full = path.join(dir, d.name);
      if (d.isDirectory()) {
        await walk(full);
      } else if (d.isFile()) {
        const ext = path.extname(d.name).slice(1).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) continue;
        scanned++;
        if (!sender.isDestroyed() && scanned % 25 === 0) {
          sender.send("fs:searchProgress", { id: opId, scanned, found: results.length });
        }
        try {
          const stat = await fs.stat(full);
          if (stat.size > MAX_FILE_BYTES || stat.size === 0) continue;
          const buf = await fs.readFile(full);
          if (isLikelyBinary(buf)) continue;
          const text = buf.toString("utf8");
          const lowerText = text.toLowerCase();
          const idx = lowerText.indexOf(lowerQuery);
          if (idx !== -1) {
            const lineNumber = text.slice(0, idx).split("\n").length;
            const snippetStart = Math.max(0, idx - 40);
            const snippet = text.slice(snippetStart, idx + lowerQuery.length + 40).replace(/\s+/g, " ").trim();
            results.push({ path: full, snippet, lineNumber });
          }
        } catch {
          // skip unreadable
        }
      }
    }
  }

  await walk(rootDir);
  return results;
}

export function registerSearchIpc() {
  ipcMain.handle("fs:searchContent", (e, rootDir: string, query: string, opId: string) =>
    searchContent(rootDir, query, opId, e.sender)
  );
}
