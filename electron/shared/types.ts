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
