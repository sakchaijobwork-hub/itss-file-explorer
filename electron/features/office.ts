import { ipcMain } from "electron";
import * as fs from "node:fs/promises";
import AdmZip from "adm-zip";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import type { DocxPreview, XlsxPreview, PptxPreview } from "../shared/types";

const MAX_ROWS = 200;
const MAX_COLS = 30;

async function previewDocx(filePath: string): Promise<DocxPreview> {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.convertToHtml({ buffer });
  return { html: result.value, warnings: result.messages.map((m) => m.message).slice(0, 10) };
}

function cellToText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  return cell.w ?? String(cell.v ?? "");
}

async function previewXlsx(filePath: string): Promise<XlsxPreview> {
  const buffer = await fs.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
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
  const zip = new AdmZip(filePath);
  const entries = zip
    .getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const na = parseInt(a.entryName.match(/slide(\d+)/)?.[1] ?? "0", 10);
      const nb = parseInt(b.entryName.match(/slide(\d+)/)?.[1] ?? "0", 10);
      return na - nb;
    });

  const slides = entries.map((entry) => {
    const xml = entry.getData().toString("utf8");
    const texts = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]);
    return texts.join(" ").trim();
  });

  return { slideCount: slides.length, slides: slides.slice(0, 60) };
}

export function registerOfficeIpc() {
  ipcMain.handle("office:previewDocx", (_e, filePath: string) => previewDocx(filePath));
  ipcMain.handle("office:previewXlsx", (_e, filePath: string) => previewXlsx(filePath));
  ipcMain.handle("office:previewPptx", (_e, filePath: string) => previewPptx(filePath));
}
