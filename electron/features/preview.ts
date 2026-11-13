import { ipcMain } from "electron";
import * as fs from "node:fs/promises";
import type { TextPreviewResult } from "../shared/types";

const MAX_PREVIEW_BYTES = 256 * 1024;

function looksBinary(buf: Buffer): boolean {
  const len = Math.min(buf.length, 8000);
  for (let i = 0; i < len; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

export function registerPreviewIpc() {
  ipcMain.handle("fs:readTextPreview", async (_e, filePath: string): Promise<TextPreviewResult> => {
    const stat = await fs.stat(filePath);
    const fd = await fs.open(filePath, "r");
    try {
      const size = Math.min(stat.size, MAX_PREVIEW_BYTES);
      const buf = Buffer.alloc(size);
      await fd.read(buf, 0, size, 0);
      if (looksBinary(buf)) {
        return { path: filePath, content: "", truncated: false, encoding: "binary" };
      }
      return {
        path: filePath,
        content: buf.toString("utf8"),
        truncated: stat.size > MAX_PREVIEW_BYTES,
        encoding: "utf8",
      };
    } finally {
      await fd.close();
    }
  });
}
