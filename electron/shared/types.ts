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

export interface ClipboardState {
  mode: "copy" | "cut" | null;
  paths: string[];
}

export type SortKey = "name" | "size" | "modifiedAt" | "type";
export type SortDirection = "asc" | "desc";

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
