import type {
  FileEntry,
  OperationProgress,
  ReadDirResult,
  QuickAccessItem,
  TagColor,
  DuplicateGroup,
  DirStatsNode,
  PermissionsInfo,
  GitStatusResult,
  TextPreviewResult,
  RecentEntry,
} from "./types";

export interface ContextMenuItem {
  id: string;
  label: string;
  enabled?: boolean;
  type?: "separator";
  checked?: boolean;
  submenu?: ContextMenuItem[];
}

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
  showContextMenu: (items: ContextMenuItem[]) => Promise<string | null>;
  confirmDelete: (names: string[]) => Promise<boolean>;
  saveDialog: (defaultPath: string, filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  openDirectoryDialog: (defaultPath?: string) => Promise<string | null>;

  getAllTags: () => Promise<Record<string, TagColor[]>>;
  setTags: (filePath: string, tags: TagColor[]) => Promise<Record<string, TagColor[]>>;
  toggleTag: (filePath: string, tag: TagColor) => Promise<Record<string, TagColor[]>>;

  listRecents: () => Promise<RecentEntry[]>;
  addRecent: (filePath: string) => Promise<RecentEntry[]>;
  clearRecents: () => Promise<RecentEntry[]>;

  hashFile: (filePath: string) => Promise<string>;
  findDuplicates: (rootDir: string, opId: string) => Promise<DuplicateGroup[]>;
  verifyChecksum: (pathA: string, pathB: string) => Promise<{ match: boolean; hashA: string; hashB: string }>;
  onDuplicateProgress: (callback: (p: { id: string; processed: number; total: number }) => void) => () => void;

  getDirStats: (rootDir: string) => Promise<DirStatsNode>;

  compress: (sourcePaths: string[], destZipPath: string) => Promise<string>;
  extract: (zipPath: string, destDir: string) => Promise<string>;
  listZip: (zipPath: string) => Promise<{ name: string; size: number; isDirectory: boolean }[]>;

  encryptFile: (filePath: string, password: string) => Promise<string>;
  decryptFile: (filePath: string, password: string) => Promise<string>;
  shred: (paths: string[]) => Promise<void>;
  getPermissions: (targetPath: string) => Promise<PermissionsInfo>;
  setPermissions: (targetPath: string, octal: string) => Promise<PermissionsInfo>;

  openTerminal: (dirPath: string) => Promise<void>;
  getGitStatus: (dirPath: string) => Promise<GitStatusResult>;

  readTextPreview: (filePath: string) => Promise<TextPreviewResult>;
}

declare global {
  interface Window {
    fileAPI: FileAPI;
  }
}
