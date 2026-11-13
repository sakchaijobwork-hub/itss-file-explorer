import { contextBridge, ipcRenderer } from "electron";
import type {
  FileEntry,
  OperationProgress,
  DuplicateGroup,
  DirStatsNode,
  PermissionsInfo,
  GitStatusResult,
  TextPreviewResult,
} from "./shared/types";
import type { TagColor } from "./features/tags";

export interface QuickAccessItem {
  name: string;
  path: string;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  enabled?: boolean;
  type?: "separator";
  checked?: boolean;
  submenu?: ContextMenuItem[];
}

const api = {
  platform: process.platform,

  readDir: (dirPath: string) => ipcRenderer.invoke("fs:readDir", dirPath),
  getHome: (): Promise<string> => ipcRenderer.invoke("fs:getHome"),
  getQuickAccess: (): Promise<QuickAccessItem[]> => ipcRenderer.invoke("fs:getQuickAccess"),
  getDrives: (): Promise<QuickAccessItem[]> => ipcRenderer.invoke("fs:getDrives"),
  getInfo: (targetPath: string): Promise<FileEntry | null> => ipcRenderer.invoke("fs:getInfo", targetPath),

  createFolder: (parentDir: string, name: string): Promise<string> =>
    ipcRenderer.invoke("fs:createFolder", parentDir, name),
  createFile: (parentDir: string, name: string): Promise<string> =>
    ipcRenderer.invoke("fs:createFile", parentDir, name),
  rename: (oldPath: string, newName: string): Promise<string> =>
    ipcRenderer.invoke("fs:rename", oldPath, newName),
  deleteToTrash: (paths: string[]): Promise<void> => ipcRenderer.invoke("fs:delete", paths),
  deletePermanent: (paths: string[]): Promise<void> => ipcRenderer.invoke("fs:deletePermanent", paths),
  copy: (sourcePaths: string[], destDir: string, opId: string): Promise<void> =>
    ipcRenderer.invoke("fs:copy", sourcePaths, destDir, opId),
  move: (sourcePaths: string[], destDir: string, opId: string): Promise<void> =>
    ipcRenderer.invoke("fs:move", sourcePaths, destDir, opId),

  openPath: (targetPath: string) => ipcRenderer.invoke("fs:openPath", targetPath),
  showInFolder: (targetPath: string) => ipcRenderer.invoke("fs:showInFolder", targetPath),

  watch: (dirPath: string) => ipcRenderer.invoke("fs:watch", dirPath),
  unwatch: (dirPath: string) => ipcRenderer.invoke("fs:unwatch", dirPath),
  onChanged: (callback: (dirPath: string) => void) => {
    const listener = (_e: unknown, dirPath: string) => callback(dirPath);
    ipcRenderer.on("fs:changed", listener);
    return () => ipcRenderer.removeListener("fs:changed", listener);
  },
  onProgress: (callback: (progress: OperationProgress) => void) => {
    const listener = (_e: unknown, progress: OperationProgress) => callback(progress);
    ipcRenderer.on("fs:progress", listener);
    return () => ipcRenderer.removeListener("fs:progress", listener);
  },

  showContextMenu: (items: ContextMenuItem[]): Promise<string | null> =>
    ipcRenderer.invoke("ui:contextMenu", items),
  confirmDelete: (names: string[]): Promise<boolean> => ipcRenderer.invoke("ui:confirmDelete", names),
  saveDialog: (defaultPath: string, filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke("ui:saveDialog", defaultPath, filters),
  openDirectoryDialog: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke("ui:openDirectoryDialog", defaultPath),

  // tags
  getAllTags: (): Promise<Record<string, TagColor[]>> => ipcRenderer.invoke("tags:getAll"),
  setTags: (filePath: string, tags: TagColor[]) => ipcRenderer.invoke("tags:set", filePath, tags),
  toggleTag: (filePath: string, tag: TagColor) => ipcRenderer.invoke("tags:toggle", filePath, tag),

  // recents
  listRecents: () => ipcRenderer.invoke("recents:list"),
  addRecent: (filePath: string) => ipcRenderer.invoke("recents:add", filePath),
  clearRecents: () => ipcRenderer.invoke("recents:clear"),

  // hashing / duplicates
  hashFile: (filePath: string): Promise<string> => ipcRenderer.invoke("fs:hashFile", filePath),
  findDuplicates: (rootDir: string, opId: string): Promise<DuplicateGroup[]> =>
    ipcRenderer.invoke("fs:findDuplicates", rootDir, opId),
  verifyChecksum: (pathA: string, pathB: string) => ipcRenderer.invoke("fs:verifyChecksum", pathA, pathB),
  onDuplicateProgress: (callback: (p: { id: string; processed: number; total: number }) => void) => {
    const listener = (_e: unknown, p: { id: string; processed: number; total: number }) => callback(p);
    ipcRenderer.on("fs:duplicateProgress", listener);
    return () => ipcRenderer.removeListener("fs:duplicateProgress", listener);
  },

  // storage analyzer
  getDirStats: (rootDir: string): Promise<DirStatsNode> => ipcRenderer.invoke("fs:getDirStats", rootDir),

  // archive
  compress: (sourcePaths: string[], destZipPath: string): Promise<string> =>
    ipcRenderer.invoke("fs:compress", sourcePaths, destZipPath),
  extract: (zipPath: string, destDir: string): Promise<string> =>
    ipcRenderer.invoke("fs:extract", zipPath, destDir),
  listZip: (zipPath: string) => ipcRenderer.invoke("fs:listZip", zipPath),

  // security
  encryptFile: (filePath: string, password: string): Promise<string> =>
    ipcRenderer.invoke("security:encrypt", filePath, password),
  decryptFile: (filePath: string, password: string): Promise<string> =>
    ipcRenderer.invoke("security:decrypt", filePath, password),
  shred: (paths: string[]): Promise<void> => ipcRenderer.invoke("security:shred", paths),
  getPermissions: (targetPath: string): Promise<PermissionsInfo> =>
    ipcRenderer.invoke("fs:getPermissions", targetPath),
  setPermissions: (targetPath: string, octal: string): Promise<PermissionsInfo> =>
    ipcRenderer.invoke("fs:setPermissions", targetPath, octal),

  // system
  openTerminal: (dirPath: string) => ipcRenderer.invoke("system:openTerminal", dirPath),
  getGitStatus: (dirPath: string): Promise<GitStatusResult> => ipcRenderer.invoke("system:getGitStatus", dirPath),

  // preview
  readTextPreview: (filePath: string): Promise<TextPreviewResult> =>
    ipcRenderer.invoke("fs:readTextPreview", filePath),
};

contextBridge.exposeInMainWorld("fileAPI", api);

export type FileAPI = typeof api;
