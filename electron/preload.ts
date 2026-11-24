import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  FileEntry,
  OperationProgress,
  DuplicateGroup,
  DirStatsNode,
  PermissionsInfo,
  GitStatusResult,
  TextPreviewResult,
  RemoteConnectionConfig,
  RemoteEntry,
  ExifData,
  AutomationRule,
  PluginInfo,
  ShareInfo,
  CompareResult,
  DocxPreview,
  XlsxPreview,
  PptxPreview,
  ContentSearchResult,
  TrashItem,
  ParallelsVm,
} from "./shared/types";
import type { TagColor } from "./features/tags";
import type { FavoriteEntry } from "./features/favorites";
import type { UpdateStatus } from "./features/updater";

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
  startDrag: (filePaths: string[]) => ipcRenderer.send("fs:startDrag", filePaths),
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
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
  hashFile: (filePath: string, algo?: string): Promise<string> => ipcRenderer.invoke("fs:hashFile", filePath, algo),
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
  getFolderSize: (dirPath: string): Promise<number> => ipcRenderer.invoke("fs:getFolderSize", dirPath),

  // archive
  compress: (sourcePaths: string[], destZipPath: string): Promise<string> =>
    ipcRenderer.invoke("fs:compress", sourcePaths, destZipPath),
  extract: (archivePath: string, destDir: string): Promise<string> =>
    ipcRenderer.invoke("fs:extract", archivePath, destDir),
  compressTar: (sourcePaths: string[], destTarPath: string, gzip: boolean): Promise<string> =>
    ipcRenderer.invoke("fs:compressTar", sourcePaths, destTarPath, gzip),
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
  openWith: (filePath: string): Promise<boolean> => ipcRenderer.invoke("system:openWith", filePath),
  readLinkTarget: (linkPath: string): Promise<string> => ipcRenderer.invoke("fs:readLinkTarget", linkPath),
  createSymlink: (targetPath: string, linkPath: string): Promise<void> =>
    ipcRenderer.invoke("fs:createSymlink", targetPath, linkPath),
  getGitStatus: (dirPath: string): Promise<GitStatusResult> => ipcRenderer.invoke("system:getGitStatus", dirPath),

  // preview
  readTextPreview: (filePath: string): Promise<TextPreviewResult> =>
    ipcRenderer.invoke("fs:readTextPreview", filePath),

  // remote (FTP/SFTP/WebDAV)
  remoteConnect: (config: RemoteConnectionConfig): Promise<string> => ipcRenderer.invoke("remote:connect", config),
  remoteListDir: (id: string, dirPath: string): Promise<RemoteEntry[]> =>
    ipcRenderer.invoke("remote:listDir", id, dirPath),
  remoteDownload: (id: string, remotePath: string, localPath: string): Promise<void> =>
    ipcRenderer.invoke("remote:download", id, remotePath, localPath),
  remoteUpload: (id: string, localPath: string, remotePath: string): Promise<void> =>
    ipcRenderer.invoke("remote:upload", id, localPath, remotePath),
  remoteMkdir: (id: string, dirPath: string): Promise<void> => ipcRenderer.invoke("remote:mkdir", id, dirPath),
  remoteRemove: (id: string, targetPath: string, isDirectory: boolean): Promise<void> =>
    ipcRenderer.invoke("remote:remove", id, targetPath, isDirectory),
  remoteDisconnect: (id: string): Promise<void> => ipcRenderer.invoke("remote:disconnect", id),

  // images
  getExif: (filePath: string): Promise<ExifData | null> => ipcRenderer.invoke("image:getExif", filePath),
  resizeImage: (srcPath: string, destDir: string, width: number, height?: number): Promise<string> =>
    ipcRenderer.invoke("image:resize", srcPath, destDir, width, height),
  rotateImage: (srcPath: string, destDir: string, degrees: number): Promise<string> =>
    ipcRenderer.invoke("image:rotate", srcPath, destDir, degrees),
  convertImage: (srcPath: string, destDir: string, format: "png" | "jpeg" | "webp" | "bmp"): Promise<string> =>
    ipcRenderer.invoke("image:convert", srcPath, destDir, format),
  stripImageMetadata: (srcPath: string, destDir: string): Promise<string> =>
    ipcRenderer.invoke("image:stripMetadata", srcPath, destDir),
  batchImageOp: (
    paths: string[],
    destDir: string,
    op: { kind: "resize" | "rotate" | "convert"; width?: number; height?: number; degrees?: number; format?: "png" | "jpeg" | "webp" | "bmp" }
  ): Promise<string[]> => ipcRenderer.invoke("image:batch", paths, destDir, op),

  // split / merge
  splitFile: (filePath: string, chunkSizeBytes: number, destDir: string): Promise<string[]> =>
    ipcRenderer.invoke("fs:splitFile", filePath, chunkSizeBytes, destDir),
  mergeFiles: (partPaths: string[], destPath: string): Promise<string> =>
    ipcRenderer.invoke("fs:mergeFiles", partPaths, destPath),

  // local network share
  startShare: (paths: string[]): Promise<ShareInfo> => ipcRenderer.invoke("share:start", paths),
  stopShare: (): Promise<void> => ipcRenderer.invoke("share:stop"),

  // notes
  getAllNotes: (): Promise<Record<string, string>> => ipcRenderer.invoke("notes:getAll"),
  setNote: (filePath: string, text: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke("notes:set", filePath, text),

  // automation
  listAutomationRules: (): Promise<AutomationRule[]> => ipcRenderer.invoke("automation:list"),
  addAutomationRule: (rule: AutomationRule): Promise<AutomationRule[]> =>
    ipcRenderer.invoke("automation:add", rule),
  removeAutomationRule: (id: string): Promise<AutomationRule[]> => ipcRenderer.invoke("automation:remove", id),
  toggleAutomationRule: (id: string): Promise<AutomationRule[]> => ipcRenderer.invoke("automation:toggle", id),

  // plugins
  listPlugins: (): Promise<PluginInfo[]> => ipcRenderer.invoke("plugins:list"),
  runPlugin: (id: string, context: { selectedPaths: string[]; currentPath: string }) =>
    ipcRenderer.invoke("plugins:run", id, context),
  openPluginsFolder: (): Promise<string> => ipcRenderer.invoke("plugins:openFolder"),

  compareDirs: (pathA: string, pathB: string): Promise<CompareResult> =>
    ipcRenderer.invoke("fs:compareDirs", pathA, pathB),

  previewDocx: (filePath: string): Promise<DocxPreview> => ipcRenderer.invoke("office:previewDocx", filePath),
  previewXlsx: (filePath: string): Promise<XlsxPreview> => ipcRenderer.invoke("office:previewXlsx", filePath),
  previewPptx: (filePath: string): Promise<PptxPreview> => ipcRenderer.invoke("office:previewPptx", filePath),
  exportPreviewToPdf: (filePath: string, destPath: string): Promise<string> =>
    ipcRenderer.invoke("office:exportPreviewToPdf", filePath, destPath),
  printFile: (filePath: string): Promise<boolean> => ipcRenderer.invoke("fs:printFile", filePath),

  listFavorites: (): Promise<FavoriteEntry[]> => ipcRenderer.invoke("favorites:list"),
  addFavorite: (folderPath: string): Promise<FavoriteEntry[]> => ipcRenderer.invoke("favorites:add", folderPath),
  removeFavorite: (folderPath: string): Promise<FavoriteEntry[]> => ipcRenderer.invoke("favorites:remove", folderPath),
  reorderFavorites: (orderedPaths: string[]): Promise<FavoriteEntry[]> => ipcRenderer.invoke("favorites:reorder", orderedPaths),

  newWindow: (): Promise<void> => ipcRenderer.invoke("system:newWindow"),
  getDiskSpace: (targetPath: string): Promise<{ total: number; free: number; used: number }> =>
    ipcRenderer.invoke("fs:getDiskSpace", targetPath),

  searchContent: (rootDir: string, query: string, opId: string): Promise<ContentSearchResult[]> =>
    ipcRenderer.invoke("fs:searchContent", rootDir, query, opId),
  onSearchProgress: (callback: (p: { id: string; scanned: number; found: number }) => void) => {
    const listener = (_e: unknown, p: { id: string; scanned: number; found: number }) => callback(p);
    ipcRenderer.on("fs:searchProgress", listener);
    return () => ipcRenderer.removeListener("fs:searchProgress", listener);
  },

  onMenuAction: (callback: (action: string) => void) => {
    const listener = (_e: unknown, action: string) => callback(action);
    ipcRenderer.on("menu:action", listener);
    return () => ipcRenderer.removeListener("menu:action", listener);
  },

  listTemplates: (): Promise<{ name: string; path: string }[]> => ipcRenderer.invoke("templates:list"),
  createFromTemplate: (templatePath: string, destDir: string): Promise<string> =>
    ipcRenderer.invoke("templates:createFrom", templatePath, destDir),
  openTemplatesFolder: (): Promise<string> => ipcRenderer.invoke("templates:openFolder"),

  listTrash: (): Promise<TrashItem[]> => ipcRenderer.invoke("trash:list"),
  restoreTrashItem: (id: string, destPath: string): Promise<void> =>
    ipcRenderer.invoke("trash:restore", id, destPath),
  deleteTrashItemForever: (id: string): Promise<void> => ipcRenderer.invoke("trash:deleteForever", id),

  isParallelsAvailable: (): Promise<boolean> => ipcRenderer.invoke("parallels:isAvailable"),
  listParallelsVms: (): Promise<ParallelsVm[]> => ipcRenderer.invoke("parallels:listVms"),
  reconnectParallelsVm: (vmName: string): Promise<void> => ipcRenderer.invoke("parallels:reconnect", vmName),

  openSmbShare: (host: string, share?: string, user?: string): Promise<void> =>
    ipcRenderer.invoke("network:openSmbShare", host, share, user),

  checkForUpdates: (): Promise<void> => ipcRenderer.invoke("updater:check"),
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke("updater:download"),
  installUpdate: (): Promise<void> => ipcRenderer.invoke("updater:install"),
  getCurrentVersion: (): Promise<string> => ipcRenderer.invoke("updater:getCurrentVersion"),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_e: unknown, status: UpdateStatus) => callback(status);
    ipcRenderer.on("updater:status", listener);
    return () => ipcRenderer.removeListener("updater:status", listener);
  },

  getPdfPageCount: (filePath: string): Promise<number> => ipcRenderer.invoke("pdf:getPageCount", filePath),
  mergePdfs: (filePaths: string[], destPath: string): Promise<string> =>
    ipcRenderer.invoke("pdf:merge", filePaths, destPath),
  extractPdfPages: (filePath: string, ranges: string, destPath: string): Promise<string> =>
    ipcRenderer.invoke("pdf:extractPages", filePath, ranges, destPath),
  splitPdfEveryNPages: (filePath: string, pagesPerFile: number, destDir: string): Promise<string[]> =>
    ipcRenderer.invoke("pdf:splitEveryNPages", filePath, pagesPerFile, destDir),
  rotatePdfPages: (filePath: string, degreesAmount: number, destPath: string, ranges?: string): Promise<string> =>
    ipcRenderer.invoke("pdf:rotate", filePath, degreesAmount, destPath, ranges),
  imagesToPdf: (imagePaths: string[], destPath: string): Promise<string> =>
    ipcRenderer.invoke("pdf:imagesToPdf", imagePaths, destPath),
};

contextBridge.exposeInMainWorld("fileAPI", api);

export type FileAPI = typeof api;
