export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  modifiedAt: number;
  createdAt: number;
  extension: string;
  hidden: boolean;
}

export interface ReadDirResult {
  path: string;
  entries: FileEntry[];
}

export interface OperationProgress {
  id: string;
  op: "copy" | "move" | "delete";
  current: number;
  total: number;
  currentFile: string;
  done: boolean;
  error?: string;
}

export type SortKey = "name" | "size" | "modifiedAt" | "type";
export type SortDirection = "asc" | "desc";
export type ViewMode = "grid" | "list" | "details" | "columns";

export interface QuickAccessItem {
  name: string;
  path: string;
}

export interface Tab {
  id: string;
  path: string;
  history: string[];
  historyIndex: number;
}

export const TAG_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "gray"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export interface DuplicateGroup {
  hash: string;
  size: number;
  paths: string[];
}

export interface DirStatsNode {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  children?: DirStatsNode[];
}

export interface PermissionsInfo {
  path: string;
  mode: string;
  octal: string;
  readable: boolean;
  writable: boolean;
  executable: boolean;
  owner?: string;
}

export interface GitFileStatus {
  path: string;
  status: string;
}

export interface GitStatusResult {
  isRepo: boolean;
  branch?: string;
  files: GitFileStatus[];
}

export interface TextPreviewResult {
  path: string;
  content: string;
  truncated: boolean;
  encoding: "utf8" | "binary";
}

export interface RecentEntry {
  path: string;
  openedAt: number;
}

export type RemoteProtocol = "ftp" | "sftp" | "webdav";

export interface RemoteConnectionConfig {
  protocol: RemoteProtocol;
  host: string;
  port?: number;
  user: string;
  password: string;
  secure?: boolean;
  url?: string;
}

export interface RemoteEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
}

export interface ExifData {
  make?: string;
  model?: string;
  dateTaken?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  width?: number;
  height?: number;
  iso?: number;
  fNumber?: number;
  exposureTime?: number;
  focalLength?: number;
}

export interface AutomationRule {
  id: string;
  watchDir: string;
  pattern: string;
  action: "move" | "tag" | "rename";
  destDir?: string;
  tag?: string;
  renamePattern?: string;
  enabled: boolean;
}

export interface PluginInfo {
  id: string;
  label: string;
  fileName: string;
}

export interface ShareInfo {
  url: string;
  qrDataUrl: string;
  paths: string[];
}

export interface CompareResult {
  onlyLeft: string[];
  onlyRight: string[];
  different: string[];
  same: string[];
}

export interface DocxPreview {
  html: string;
  warnings: string[];
}

export interface XlsxSheetPreview {
  name: string;
  rows: string[][];
  truncated: boolean;
  totalRows: number;
}

export interface XlsxPreview {
  sheets: XlsxSheetPreview[];
}

export interface PptxPreview {
  slideCount: number;
  slides: string[];
}

export interface FavoriteEntry {
  name: string;
  path: string;
}

export interface DiskSpace {
  total: number;
  free: number;
  used: number;
}

export interface ContentSearchResult {
  path: string;
  snippet: string;
  lineNumber: number;
}

export interface ParallelsVm {
  uuid: string;
  name: string;
  status: string;
  mountedPath: string | null;
  accessible: boolean;
}

export interface TrashItem {
  id: string;
  name: string;
  size: number;
  deletedAt: number | null;
  originalPath: string | null;
  isDirectory: boolean;
}
