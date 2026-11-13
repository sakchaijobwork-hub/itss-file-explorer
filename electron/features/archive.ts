import { ipcMain } from "electron";
import * as path from "node:path";
import AdmZip from "adm-zip";

export function registerArchiveIpc() {
  ipcMain.handle("fs:compress", async (_e, sourcePaths: string[], destZipPath: string) => {
    const zip = new AdmZip();
    for (const src of sourcePaths) {
      const stat = await import("node:fs/promises").then((m) => m.stat(src));
      if (stat.isDirectory()) {
        zip.addLocalFolder(src, path.basename(src));
      } else {
        zip.addLocalFile(src);
      }
    }
    zip.writeZip(destZipPath);
    return destZipPath;
  });

  ipcMain.handle("fs:extract", async (_e, zipPath: string, destDir: string) => {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, true);
    return destDir;
  });

  ipcMain.handle("fs:listZip", async (_e, zipPath: string) => {
    const zip = new AdmZip(zipPath);
    return zip.getEntries().map((entry) => ({
      name: entry.entryName,
      size: entry.header.size,
      isDirectory: entry.isDirectory,
    }));
  });
}
