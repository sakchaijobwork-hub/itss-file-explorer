import {
  Folder,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  Presentation,
  File as FileIcon,
} from "lucide-react";
import type { ComponentType } from "react";

const EXT_MAP: Record<string, ComponentType<{ className?: string }>> = {
  png: FileImage, jpg: FileImage, jpeg: FileImage, gif: FileImage, webp: FileImage, svg: FileImage, bmp: FileImage, heic: FileImage,
  mp3: FileAudio, wav: FileAudio, flac: FileAudio, aac: FileAudio, m4a: FileAudio,
  mp4: FileVideo, mov: FileVideo, mkv: FileVideo, avi: FileVideo, webm: FileVideo,
  zip: FileArchive, rar: FileArchive, "7z": FileArchive, tar: FileArchive, gz: FileArchive,
  js: FileCode, ts: FileCode, tsx: FileCode, jsx: FileCode, json: FileCode, py: FileCode, java: FileCode, go: FileCode, rs: FileCode, html: FileCode, css: FileCode, c: FileCode, cpp: FileCode, sh: FileCode,
  xlsx: FileSpreadsheet, xls: FileSpreadsheet, xlsm: FileSpreadsheet, csv: FileSpreadsheet,
  pptx: Presentation, ppt: Presentation, ppsx: Presentation, key: Presentation,
  txt: FileText, md: FileText, pdf: FileText, doc: FileText, docx: FileText, rtf: FileText, pages: FileText,
};

const OFFICE_COLORS: Record<string, string> = {
  doc: "#2b579a", docx: "#2b579a", rtf: "#2b579a",
  xls: "#217346", xlsx: "#217346", xlsm: "#217346", csv: "#217346",
  ppt: "#d24726", pptx: "#d24726", ppsx: "#d24726",
  pdf: "#dc2626",
};

export function getFileIconComponent(extension: string, isDirectory: boolean) {
  if (isDirectory) return Folder;
  return EXT_MAP[extension] ?? FileIcon;
}

export function getFileIconColorClass(extension: string, isDirectory: boolean): string | undefined {
  if (isDirectory) return undefined;
  return OFFICE_COLORS[extension];
}

export const OFFICE_EXTENSIONS = new Set(["doc", "docx", "xls", "xlsx", "xlsm", "ppt", "pptx", "ppsx"]);
export const DOCX_EXTENSIONS = new Set(["doc", "docx"]);
export const XLSX_EXTENSIONS = new Set(["xls", "xlsx", "xlsm"]);
export const PPTX_EXTENSIONS = new Set(["ppt", "pptx", "ppsx"]);

const KIND_CATEGORIES: { label: string; exts: Set<string> }[] = [
  { label: "Images", exts: new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic"]) },
  { label: "Videos", exts: new Set(["mp4", "mov", "mkv", "avi", "webm"]) },
  { label: "Audio", exts: new Set(["mp3", "wav", "flac", "aac", "m4a"]) },
  { label: "Documents", exts: new Set(["doc", "docx", "pdf", "txt", "md", "rtf", "pages"]) },
  { label: "Spreadsheets", exts: new Set(["xls", "xlsx", "xlsm", "csv"]) },
  { label: "Presentations", exts: new Set(["ppt", "pptx", "ppsx", "key"]) },
  { label: "Archives", exts: new Set(["zip", "rar", "7z", "tar", "gz", "tgz"]) },
  { label: "Code", exts: new Set(["js", "ts", "tsx", "jsx", "json", "py", "java", "go", "rs", "html", "css", "c", "cpp", "sh"]) },
];

export function getKindLabel(extension: string, isDirectory: boolean): string {
  if (isDirectory) return "Folders";
  for (const cat of KIND_CATEGORIES) {
    if (cat.exts.has(extension)) return cat.label;
  }
  return "Other";
}
