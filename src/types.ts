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
export type ViewMode = "grid" | "list" | "details";

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
