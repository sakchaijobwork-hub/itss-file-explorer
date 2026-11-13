import type { FileEntry, OperationProgress, ReadDirResult } from "./types";
import type { QuickAccessItem } from "./types";

export interface FileAPI {
  platform: string;
  readDir: (dirPath: string) => Promise<ReadDirResult>;
  getHome: () => Promise<string>;
  getQuickAccess: () => Promise<QuickAccessItem[]>;
  getDrives: () => Promise<QuickAccessItem[]>;
  getInfo: (targetPath: string) => Promise<FileEntry | null>;
  createFolder: (parentDir: string, name: string) => Promise<string>;
  createFile: (parentDir: string, name: string) => Promise<string>;
  rename: (oldPath: string, newName: string) => Promise<string>;
  deleteToTrash: (paths: string[]) => Promise<void>;
  deletePermanent: (paths: string[]) => Promise<void>;
  copy: (sourcePaths: string[], destDir: string, opId: string) => Promise<void>;
  move: (sourcePaths: string[], destDir: string, opId: string) => Promise<void>;
  openPath: (targetPath: string) => Promise<string>;
  showInFolder: (targetPath: string) => Promise<void>;
  watch: (dirPath: string) => Promise<void>;
  unwatch: (dirPath: string) => Promise<void>;
  onChanged: (callback: (dirPath: string) => void) => () => void;
  onProgress: (callback: (progress: OperationProgress) => void) => () => void;
  showContextMenu: (
    items: { id: string; label: string; enabled?: boolean; type?: "separator" }[]
  ) => Promise<string | null>;
  confirmDelete: (names: string[]) => Promise<boolean>;
}

declare global {
  interface Window {
    fileAPI: FileAPI;
  }
}
