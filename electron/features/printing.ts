import { ipcMain, BrowserWindow } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { buildExportHtml, isOfficePreviewable } from "./office";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);
const TEXT_EXTS = new Set([
  "txt", "md", "json", "js", "ts", "tsx", "jsx", "css", "html", "py", "java", "go", "rs", "c", "cpp", "sh", "yml", "yaml", "xml", "log", "csv",
]);
const MAX_TEXT_PRINT_BYTES = 5 * 1024 * 1024;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function buildPrintHtml(filePath: string, ext: string): Promise<string | null> {
  if (TEXT_EXTS.has(ext)) {
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_TEXT_PRINT_BYTES) return null;
    const content = await fs.readFile(filePath, "utf8");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><pre style="font-family: Menlo, monospace; font-size: 11px; white-space: pre-wrap; word-break: break-word;">${escapeHtml(content)}</pre></body></html>`;
  }
  if (IMAGE_EXTS.has(ext)) {
    const fileUrl = `file://${encodeURI(filePath)}`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;display:flex;align-items:center;justify-content:center;"><img src="${fileUrl}" style="max-width:100%;max-height:100vh;"></body></html>`;
  }
  if (isOfficePreviewable(ext)) {
    return buildExportHtml(filePath, ext);
  }
  return null;
}

async function printFile(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).slice(1).toLowerCase();

  // PDFs: Chromium's built-in viewer handles print UI directly when loaded.
  if (ext === "pdf") {
    const win = new BrowserWindow({ show: false, webPreferences: { plugins: true } });
    try {
      await win.loadURL(`file://${encodeURI(filePath)}`);
      win.show();
      await new Promise((resolve) => win.webContents.print({ silent: false }, () => resolve(undefined)));
    } finally {
      win.destroy();
    }
    return true;
  }

  const html = await buildPrintHtml(filePath, ext);
  if (!html) return false;

  const win = new BrowserWindow({ show: false });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise((resolve) => win.webContents.print({ silent: false }, () => resolve(undefined)));
  } finally {
    win.destroy();
  }
  return true;
}

export function registerPrintingIpc() {
  ipcMain.handle("fs:printFile", (_e, filePath: string) => printFile(filePath));
}
