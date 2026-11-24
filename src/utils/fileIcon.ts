import type { ComponentType, CSSProperties } from "react";
import { FolderIcon } from "@/components/icons/FolderIcon";
import {
  WordIcon,
  ExcelIcon,
  PowerPointIcon,
  PdfFileIcon,
  TextFileIcon,
  CodeFileIcon,
  ImageFileIcon,
  VideoFileIcon,
  AudioFileIcon,
  ArchiveFileIcon,
  GenericFileIcon,
} from "@/components/icons/FileTypeIcons";

const DOC_EXTS = ["doc", "docx", "docm", "dotx", "dotm"];
const XLS_EXTS = ["xls", "xlsx", "xlsm", "xltx", "xltm", "csv"];
const PPT_EXTS = ["ppt", "pptx", "pptm", "ppsx", "ppsm", "potx", "potm", "key"];
const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic"];
const VIDEO_EXTS = ["mp4", "mov", "mkv", "avi", "webm"];
const AUDIO_EXTS = ["mp3", "wav", "flac", "aac", "m4a"];
const ARCHIVE_EXTS = ["zip", "rar", "7z", "tar", "gz", "tgz"];
const CODE_EXTS = ["js", "ts", "tsx", "jsx", "json", "py", "java", "go", "rs", "html", "css", "c", "cpp", "sh"];
const TEXT_EXTS = ["txt", "md", "rtf", "pages"];

type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>;

const EXT_MAP: Record<string, IconComponent> = {
  ...Object.fromEntries(IMAGE_EXTS.map((e) => [e, ImageFileIcon])),
  ...Object.fromEntries(VIDEO_EXTS.map((e) => [e, VideoFileIcon])),
  ...Object.fromEntries(AUDIO_EXTS.map((e) => [e, AudioFileIcon])),
  ...Object.fromEntries(ARCHIVE_EXTS.map((e) => [e, ArchiveFileIcon])),
  ...Object.fromEntries(CODE_EXTS.map((e) => [e, CodeFileIcon])),
  ...Object.fromEntries(TEXT_EXTS.map((e) => [e, TextFileIcon])),
  ...Object.fromEntries(XLS_EXTS.map((e) => [e, ExcelIcon])),
  ...Object.fromEntries(PPT_EXTS.map((e) => [e, PowerPointIcon])),
  ...Object.fromEntries(DOC_EXTS.map((e) => [e, WordIcon])),
  pdf: PdfFileIcon,
};

export function getFileIconComponent(extension: string, isDirectory: boolean) {
  if (isDirectory) return FolderIcon;
  return EXT_MAP[extension] ?? GenericFileIcon;
}

export const OFFICE_EXTENSIONS = new Set([...DOC_EXTS, ...XLS_EXTS, ...PPT_EXTS]);
export const DOCX_EXTENSIONS = new Set(DOC_EXTS);
export const XLSX_EXTENSIONS = new Set(XLS_EXTS);
export const PPTX_EXTENSIONS = new Set(PPT_EXTS);

const KIND_CATEGORIES: { label: string; exts: Set<string> }[] = [
  { label: "Images", exts: new Set(IMAGE_EXTS) },
  { label: "Videos", exts: new Set(VIDEO_EXTS) },
  { label: "Audio", exts: new Set(AUDIO_EXTS) },
  { label: "Documents", exts: new Set([...DOC_EXTS, "pdf", ...TEXT_EXTS]) },
  { label: "Spreadsheets", exts: new Set(XLS_EXTS) },
  { label: "Presentations", exts: new Set(PPT_EXTS) },
  { label: "Archives", exts: new Set(ARCHIVE_EXTS) },
  { label: "Code", exts: new Set(CODE_EXTS) },
];

export function getKindLabel(extension: string, isDirectory: boolean): string {
  if (isDirectory) return "Folders";
  for (const cat of KIND_CATEGORIES) {
    if (cat.exts.has(extension)) return cat.label;
  }
  return "Other";
}
