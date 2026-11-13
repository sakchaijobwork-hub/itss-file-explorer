import { ipcMain, BrowserWindow } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import AdmZip from "adm-zip";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import type { DocxPreview, XlsxPreview, PptxPreview } from "../shared/types";

const DOCX_EXTS = new Set(["docx", "docm", "dotx", "dotm"]);
const XLSX_EXTS = new Set(["xls", "xlsx", "xlsm", "xltx", "xltm"]);
const PPTX_EXTS = new Set(["pptx", "pptm", "ppsx", "ppsm", "potx", "potm"]);

const MAX_ROWS = 200;
const MAX_COLS = 30;
const MAX_PREVIEW_FILE_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_DOCX_IMAGE_BYTES = 400 * 1024; // skip embedding images larger than this
const MAX_DOCX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024; // stop embedding once this much image data is used
const PREVIEW_TIMEOUT_MS = 15000;

const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
// CFB (OLE2) directory-entry names are stored as raw UTF-16LE strings, so a
// plain substring scan reliably detects the standard MS-OFFCRYPTO stream
// names without needing a full CFB parser.
const ENCRYPTION_MARKERS = ["EncryptionInfo", "EncryptedPackage"].map((s) => Buffer.from(s, "utf16le"));
const OLE_SCAN_BYTES = 4 * 1024 * 1024;

class PreviewError extends Error {}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PreviewError(`${label} timed out — the file may be too complex to preview.`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function assertPreviewable(filePath: string, legacyLabel: string) {
  const stat = await fs.stat(filePath);
  if (stat.size === 0) {
    throw new PreviewError("File is empty.");
  }
  if (stat.size > MAX_PREVIEW_FILE_BYTES) {
    throw new PreviewError(`File is too large to preview (${Math.round(stat.size / 1024 / 1024)}MB). Click Open to view it in its default application.`);
  }
  const fd = await fs.open(filePath, "r");
  try {
    const header = Buffer.alloc(8);
    await fd.read(header, 0, 8, 0);
    if (header.equals(OLE_MAGIC)) {
      // Both legacy binary Office files AND password-protected modern OOXML
      // files (.docx/.xlsx/.pptx wrapped for encryption) share this same
      // OLE2/CFB container signature — scan for the encryption stream names
      // to tell the two apart and give an accurate message either way.
      const scanSize = Math.min(stat.size, OLE_SCAN_BYTES);
      const scanBuf = Buffer.alloc(scanSize);
      await fd.read(scanBuf, 0, scanSize, 0);
      const isEncrypted = ENCRYPTION_MARKERS.some((marker) => scanBuf.includes(marker));
      if (isEncrypted) {
        throw new PreviewError("This file is password-protected and can't be previewed in-app. Click Open to enter the password in its default application.");
      }
      throw new PreviewError(`This is a legacy ${legacyLabel} (97-2003) file. In-app preview only supports the modern format. Click Open to view it in its default application.`);
    }
  } finally {
    await fd.close();
  }
}

async function previewDocx(filePath: string): Promise<DocxPreview> {
  await assertPreviewable(filePath, "Word .doc");

  let imageBytesUsed = 0;
  const convertImage = mammoth.images.imgElement(async (image) => {
    const buffer = await image.readAsBuffer();
    if (buffer.length > MAX_DOCX_IMAGE_BYTES || imageBytesUsed + buffer.length > MAX_DOCX_TOTAL_IMAGE_BYTES) {
      return { src: "" };
    }
    imageBytesUsed += buffer.length;
    return { src: `data:${image.contentType};base64,${buffer.toString("base64")}` };
  });

  const buffer = await fs.readFile(filePath);
  let result: Awaited<ReturnType<typeof mammoth.convertToHtml>>;
  try {
    result = await withTimeout(mammoth.convertToHtml({ buffer }, { convertImage }), PREVIEW_TIMEOUT_MS, "DOCX preview");
  } catch (err) {
    if (err instanceof PreviewError) throw err;
    throw new PreviewError("Could not read this document — it may be corrupt or password-protected. Click Open to try the default application.");
  }

  return { html: result.value, warnings: result.messages.map((m) => m.message).slice(0, 10) };
}

function cellToText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  return cell.w ?? String(cell.v ?? "");
}

async function previewXlsx(filePath: string): Promise<XlsxPreview> {
  await assertPreviewable(filePath, "Excel .xls");

  const buffer = await fs.readFile(filePath);
  let workbook: XLSX.WorkBook;
  try {
    workbook = await withTimeout(
      Promise.resolve().then(() => XLSX.read(buffer, { type: "buffer" })),
      PREVIEW_TIMEOUT_MS,
      "XLSX preview"
    );
  } catch (err) {
    if (err instanceof PreviewError) throw err;
    throw new PreviewError("Could not read this spreadsheet — it may be corrupt or password-protected. Click Open to try the default application.");
  }

  if (workbook.SheetNames.length === 0) {
    throw new PreviewError("This spreadsheet has no readable sheets.");
  }

  const sheets = workbook.SheetNames.slice(0, 10).map((name) => {
    const sheet = workbook.Sheets[name];
    const ref = sheet["!ref"];
    const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    const rows: string[][] = [];
    const maxRow = Math.min(range.e.r, range.s.r + MAX_ROWS);
    const maxCol = Math.min(range.e.c, range.s.c + MAX_COLS);
    for (let r = range.s.r; r <= maxRow; r++) {
      const row: string[] = [];
      for (let c = range.s.c; c <= maxCol; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        row.push(cellToText(sheet[addr]));
      }
      rows.push(row);
    }
    return {
      name,
      rows,
      truncated: range.e.r > maxRow || range.e.c > maxCol,
      totalRows: range.e.r - range.s.r + 1,
    };
  });
  return { sheets };
}

async function previewPptx(filePath: string): Promise<PptxPreview> {
  await assertPreviewable(filePath, "PowerPoint .ppt");

  let zip: AdmZip;
  try {
    zip = new AdmZip(filePath);
  } catch {
    throw new PreviewError("Could not read this presentation — it may be corrupt or password-protected. Click Open to try the default application.");
  }

  const entries = zip
    .getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const na = parseInt(a.entryName.match(/slide(\d+)/)?.[1] ?? "0", 10);
      const nb = parseInt(b.entryName.match(/slide(\d+)/)?.[1] ?? "0", 10);
      return na - nb;
    });

  if (entries.length === 0) {
    throw new PreviewError("No slides found — this file may not be a valid PowerPoint presentation.");
  }

  const slides = entries.map((entry) => {
    const xml = entry.getData().toString("utf8");
    const texts = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]);
    return texts.join(" ").trim();
  });

  return { slideCount: slides.length, slides: slides.slice(0, 60) };
}

function htmlDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 24px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
  td, th { border: 1px solid #ccc; padding: 3px 6px; font-size: 11px; }
  .slide { border: 1px solid #ccc; border-radius: 6px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid; }
  .slide-label { font-size: 10px; color: #888; margin-bottom: 4px; }
</style></head><body>${bodyHtml}</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function buildExportHtml(filePath: string, ext: string): Promise<string> {
  const name = path.basename(filePath);
  if (DOCX_EXTS.has(ext)) {
    const doc = await previewDocx(filePath);
    return htmlDocument(name, doc.html);
  }
  if (XLSX_EXTS.has(ext)) {
    const xlsx = await previewXlsx(filePath);
    const body = xlsx.sheets
      .map((sheet) => {
        const rows = sheet.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("");
        return `<h3>${escapeHtml(sheet.name)}</h3><table>${rows}</table>`;
      })
      .join("");
    return htmlDocument(name, body);
  }
  if (PPTX_EXTS.has(ext)) {
    const pptx = await previewPptx(filePath);
    const body = pptx.slides
      .map((text, i) => `<div class="slide"><div class="slide-label">Slide ${i + 1}</div><div>${escapeHtml(text).replace(/\n/g, "<br>")}</div></div>`)
      .join("");
    return htmlDocument(name, body);
  }
  throw new PreviewError("Exporting to PDF is only supported for Word, Excel, and PowerPoint previews.");
}

export async function exportPreviewToPdf(filePath: string, destPath: string): Promise<string> {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const html = await buildExportHtml(filePath, ext);

  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfBuffer = await win.webContents.printToPDF({ printBackground: true });
    await fs.writeFile(destPath, pdfBuffer);
    return destPath;
  } finally {
    win.destroy();
  }
}

export function registerOfficeIpc() {
  ipcMain.handle("office:previewDocx", (_e, filePath: string) => previewDocx(filePath));
  ipcMain.handle("office:previewXlsx", (_e, filePath: string) => previewXlsx(filePath));
  ipcMain.handle("office:previewPptx", (_e, filePath: string) => previewPptx(filePath));
  ipcMain.handle("office:exportPreviewToPdf", (_e, filePath: string, destPath: string) => exportPreviewToPdf(filePath, destPath));
}
