import { ipcMain } from "electron";
import * as fs from "node:fs/promises";
import { PDFDocument, degrees } from "pdf-lib";

async function getPageCount(filePath: string): Promise<number> {
  const bytes = await fs.readFile(filePath);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

async function mergePdfs(filePaths: string[], destPath: string): Promise<string> {
  const merged = await PDFDocument.create();
  for (const filePath of filePaths) {
    const bytes = await fs.readFile(filePath);
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  await fs.writeFile(destPath, await merged.save());
  return destPath;
}

function parsePageRanges(ranges: string, pageCount: number): number[] {
  const indices: number[] = [];
  for (const part of ranges.split(",").map((p) => p.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const start = Math.max(1, parseInt(m[1], 10));
    const end = Math.min(pageCount, m[2] ? parseInt(m[2], 10) : start);
    for (let i = start; i <= end; i++) indices.push(i - 1);
  }
  return indices;
}

async function extractPages(filePath: string, ranges: string, destPath: string): Promise<string> {
  const bytes = await fs.readFile(filePath);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const indices = parsePageRanges(ranges, src.getPageCount());
  if (indices.length === 0) throw new Error("No valid pages in that range.");
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  for (const page of pages) out.addPage(page);
  await fs.writeFile(destPath, await out.save());
  return destPath;
}

async function splitPdfEveryNPages(filePath: string, pagesPerFile: number, destDir: string): Promise<string[]> {
  const bytes = await fs.readFile(filePath);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const outputs: string[] = [];
  const baseName = filePath.replace(/\\/g, "/").split("/").pop()!.replace(/\.pdf$/i, "");

  for (let start = 0; start < total; start += pagesPerFile) {
    const end = Math.min(total, start + pagesPerFile);
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    for (const page of pages) out.addPage(page);
    const destPath = `${destDir}/${baseName}_p${start + 1}-${end}.pdf`;
    await fs.writeFile(destPath, await out.save());
    outputs.push(destPath);
  }
  return outputs;
}

async function rotatePages(filePath: string, degreesAmount: number, destPath: string, ranges?: string): Promise<string> {
  const bytes = await fs.readFile(filePath);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const targetIndices = ranges ? new Set(parsePageRanges(ranges, doc.getPageCount())) : null;
  doc.getPages().forEach((page, i) => {
    if (!targetIndices || targetIndices.has(i)) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + degreesAmount) % 360));
    }
  });
  await fs.writeFile(destPath, await doc.save());
  return destPath;
}

async function imagesToPdf(imagePaths: string[], destPath: string): Promise<string> {
  const doc = await PDFDocument.create();
  for (const imagePath of imagePaths) {
    const bytes = await fs.readFile(imagePath);
    const lower = imagePath.toLowerCase();
    const image = lower.endsWith(".png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  await fs.writeFile(destPath, await doc.save());
  return destPath;
}

export function registerPdfToolsIpc() {
  ipcMain.handle("pdf:getPageCount", (_e, filePath: string) => getPageCount(filePath));
  ipcMain.handle("pdf:merge", (_e, filePaths: string[], destPath: string) => mergePdfs(filePaths, destPath));
  ipcMain.handle("pdf:extractPages", (_e, filePath: string, ranges: string, destPath: string) =>
    extractPages(filePath, ranges, destPath)
  );
  ipcMain.handle("pdf:splitEveryNPages", (_e, filePath: string, pagesPerFile: number, destDir: string) =>
    splitPdfEveryNPages(filePath, pagesPerFile, destDir)
  );
  ipcMain.handle("pdf:rotate", (_e, filePath: string, degreesAmount: number, destPath: string, ranges?: string) =>
    rotatePages(filePath, degreesAmount, destPath, ranges)
  );
  ipcMain.handle("pdf:imagesToPdf", (_e, imagePaths: string[], destPath: string) => imagesToPdf(imagePaths, destPath));
}
