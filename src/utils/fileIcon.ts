import {
  Folder,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  File as FileIcon,
} from "lucide-react";
import type { ComponentType } from "react";

const EXT_MAP: Record<string, ComponentType<{ className?: string }>> = {
  png: FileImage, jpg: FileImage, jpeg: FileImage, gif: FileImage, webp: FileImage, svg: FileImage, bmp: FileImage, heic: FileImage,
  mp3: FileAudio, wav: FileAudio, flac: FileAudio, aac: FileAudio, m4a: FileAudio,
  mp4: FileVideo, mov: FileVideo, mkv: FileVideo, avi: FileVideo, webm: FileVideo,
  zip: FileArchive, rar: FileArchive, "7z": FileArchive, tar: FileArchive, gz: FileArchive,
  js: FileCode, ts: FileCode, tsx: FileCode, jsx: FileCode, json: FileCode, py: FileCode, java: FileCode, go: FileCode, rs: FileCode, html: FileCode, css: FileCode, c: FileCode, cpp: FileCode, sh: FileCode,
  xlsx: FileSpreadsheet, xls: FileSpreadsheet, csv: FileSpreadsheet,
  txt: FileText, md: FileText, pdf: FileText, doc: FileText, docx: FileText,
};

export function getFileIconComponent(extension: string, isDirectory: boolean) {
  if (isDirectory) return Folder;
  return EXT_MAP[extension] ?? FileIcon;
}
