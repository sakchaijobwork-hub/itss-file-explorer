import { ipcMain } from "electron";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import AdmZip from "adm-zip";
import * as tar from "tar";

export function isTarArchive(filePath: string): boolean {
  return /\.(tar|tar\.gz|tgz|tar\.bz2)$/i.test(filePath);
}

export function registerArchiveIpc() {
  ipcMain.handle("fs:compress", async (_e, sourcePaths: string[], destZipPath: string) => {
    const zip = new AdmZip();
    for (const src of sourcePaths) {
      const stat = await fs.stat(src);
      if (stat.isDirectory()) {
        zip.addLocalFolder(src, path.basename(src));
      } else {
        zip.addLocalFile(src);
      }
    }
    zip.writeZip(destZipPath);
    return destZipPath;
  });

  ipcMain.handle("fs:extract", async (_e, archivePath: string, destDir: string) => {
    if (isTarArchive(archivePath)) {
      await fs.mkdir(destDir, { recursive: true });
      await tar.x({ file: archivePath, cwd: destDir });
    } else {
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(destDir, true);
    }
    return destDir;
  });

  ipcMain.handle("fs:compressTar", async (_e, sourcePaths: string[], destTarPath: string, gzip: boolean) => {
    const parentDirs = new Set(sourcePaths.map((p) => path.dirname(p)));
    const cwd = parentDirs.size === 1 ? Array.from(parentDirs)[0] : path.dirname(sourcePaths[0]);
    const names = sourcePaths.map((p) => path.relative(cwd, p));
    await tar.c({ file: destTarPath, cwd, gzip }, names);
    return destTarPath;
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
