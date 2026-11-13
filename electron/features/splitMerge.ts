import { ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

async function splitFile(filePath: string, chunkSizeBytes: number, destDir: string): Promise<string[]> {
  const stat = await fs.stat(filePath);
  const baseName = path.basename(filePath);
  const fd = await fs.open(filePath, "r");
  const parts: string[] = [];
  try {
    let offset = 0;
    let index = 1;
    while (offset < stat.size) {
      const size = Math.min(chunkSizeBytes, stat.size - offset);
      const buf = Buffer.alloc(size);
      await fd.read(buf, 0, size, offset);
      const partPath = path.join(destDir, `${baseName}.part${String(index).padStart(3, "0")}`);
      await fs.writeFile(partPath, buf);
      parts.push(partPath);
      offset += size;
      index++;
    }
  } finally {
    await fd.close();
  }
  return parts;
}

async function mergeFiles(partPaths: string[], destPath: string): Promise<string> {
  const sorted = [...partPaths].sort();
  const outFd = await fs.open(destPath, "w");
  try {
    for (const part of sorted) {
      const buf = await fs.readFile(part);
      await outFd.write(buf);
    }
  } finally {
    await outFd.close();
  }
  return destPath;
}

export function registerSplitMergeIpc() {
  ipcMain.handle("fs:splitFile", (_e, filePath: string, chunkSizeBytes: number, destDir: string) =>
    splitFile(filePath, chunkSizeBytes, destDir)
  );
  ipcMain.handle("fs:mergeFiles", (_e, partPaths: string[], destPath: string) => mergeFiles(partPaths, destPath));
}
