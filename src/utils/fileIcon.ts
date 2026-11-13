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

const DOC_EXTS = ["doc", "docx", "docm", "dotx", "dotm"];
const XLS_EXTS = ["xls", "xlsx", "xlsm", "xltx", "xltm", "csv"];
const PPT_EXTS = ["ppt", "pptx", "pptm", "ppsx", "ppsm", "potx", "potm", "key"];

const EXT_MAP: Record<string, ComponentType<{ className?: string }>> = {
  png: FileImage, jpg: FileImage, jpeg: FileImage, gif: FileImage, webp: FileImage, svg: FileImage, bmp: FileImage, heic: FileImage,
  mp3: FileAudio, wav: FileAudio, flac: FileAudio, aac: FileAudio, m4a: FileAudio,
  mp4: FileVideo, mov: FileVideo, mkv: FileVideo, avi: FileVideo, webm: FileVideo,
  zip: FileArchive, rar: FileArchive, "7z": FileArchive, tar: FileArchive, gz: FileArchive, tgz: FileArchive,
  js: FileCode, ts: FileCode, tsx: FileCode, jsx: FileCode, json: FileCode, py: FileCode, java: FileCode, go: FileCode, rs: FileCode, html: FileCode, css: FileCode, c: FileCode, cpp: FileCode, sh: FileCode,
  txt: FileText, md: FileText, pdf: FileText, rtf: FileText, pages: FileText,
  ...Object.fromEntries(XLS_EXTS.map((e) => [e, FileSpreadsheet])),
  ...Object.fromEntries(PPT_EXTS.map((e) => [e, Presentation])),
  ...Object.fromEntries(DOC_EXTS.map((e) => [e, FileText])),
};

const OFFICE_COLORS: Record<string, string> = {
  ...Object.fromEntries(DOC_EXTS.map((e) => [e, "#2b579a"])),
  rtf: "#2b579a",
  ...Object.fromEntries(XLS_EXTS.map((e) => [e, "#217346"])),
  ...Object.fromEntries(PPT_EXTS.map((e) => [e, "#d24726"])),
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

export const OFFICE_EXTENSIONS = new Set([...DOC_EXTS, ...XLS_EXTS, ...PPT_EXTS]);
export const DOCX_EXTENSIONS = new Set(DOC_EXTS);
export const XLSX_EXTENSIONS = new Set(XLS_EXTS);
export const PPTX_EXTENSIONS = new Set(PPT_EXTS);

const KIND_CATEGORIES: { label: string; exts: Set<string> }[] = [
  { label: "Images", exts: new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic"]) },
  { label: "Videos", exts: new Set(["mp4", "mov", "mkv", "avi", "webm"]) },
  { label: "Audio", exts: new Set(["mp3", "wav", "flac", "aac", "m4a"]) },
  { label: "Documents", exts: new Set([...DOC_EXTS, "pdf", "txt", "md", "pages"]) },
  { label: "Spreadsheets", exts: new Set(XLS_EXTS) },
  { label: "Presentations", exts: new Set(PPT_EXTS) },
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
