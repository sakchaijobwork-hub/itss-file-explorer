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
  FavoriteEntry,
  DiskSpace,
  ContentSearchResult,
  TrashItem,
  ParallelsVm,
  UpdateStatus,
  OpenWithAppsResult,
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
  copy: (sourcePaths: string[], destDir: string, opId: string) => Promise<string[]>;
  move: (sourcePaths: string[], destDir: string, opId: string) => Promise<{ from: string; to: string }[]>;
  readClipboardFiles: () => Promise<string[]>;
  writeClipboardFiles: (paths: string[]) => Promise<void>;
  openPath: (targetPath: string) => Promise<string>;
  startDrag: (filePaths: string[]) => void;
  getPathForFile: (file: File) => string;
  showInFolder: (targetPath: string) => Promise<void>;
  watch: (dirPath: string) => Promise<void>;
  unwatch: (dirPath: string) => Promise<void>;
  onChanged: (callback: (dirPath: string) => void) => () => void;
  onProgress: (callback: (progress: OperationProgress) => void) => () => void;
  showContextMenu: (items: ContextMenuItem[]) => Promise<string | null>;
  confirmDelete: (names: string[]) => Promise<boolean>;
  confirm: (message: string, confirmLabel: string) => Promise<boolean>;
  saveDialog: (defaultPath: string, filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  openDirectoryDialog: (defaultPath?: string) => Promise<string | null>;

  getAllTags: () => Promise<Record<string, TagColor[]>>;
  setTags: (filePath: string, tags: TagColor[]) => Promise<Record<string, TagColor[]>>;
  toggleTag: (filePath: string, tag: TagColor) => Promise<Record<string, TagColor[]>>;

  listRecents: () => Promise<RecentEntry[]>;
  addRecent: (filePath: string) => Promise<RecentEntry[]>;
  clearRecents: () => Promise<RecentEntry[]>;

  hashFile: (filePath: string, algo?: string) => Promise<string>;
  findDuplicates: (rootDir: string, opId: string) => Promise<DuplicateGroup[]>;
  verifyChecksum: (pathA: string, pathB: string) => Promise<{ match: boolean; hashA: string; hashB: string }>;
  onDuplicateProgress: (callback: (p: { id: string; processed: number; total: number }) => void) => () => void;

  getDirStats: (rootDir: string) => Promise<DirStatsNode>;
  getFolderSize: (dirPath: string) => Promise<number>;

  compress: (sourcePaths: string[], destZipPath: string) => Promise<string>;
  extract: (archivePath: string, destDir: string) => Promise<string>;
  compressTar: (sourcePaths: string[], destTarPath: string, gzip: boolean) => Promise<string>;
  listZip: (zipPath: string) => Promise<{ name: string; size: number; isDirectory: boolean }[]>;

  encryptFile: (filePath: string, password: string) => Promise<string>;
  decryptFile: (filePath: string, password: string) => Promise<string>;
  shred: (paths: string[]) => Promise<void>;
  getPermissions: (targetPath: string) => Promise<PermissionsInfo>;
  setPermissions: (targetPath: string, octal: string) => Promise<PermissionsInfo>;

  openTerminal: (dirPath: string) => Promise<void>;
  openWith: (filePath: string) => Promise<boolean>;
  listOpenWithApps: (filePath: string) => Promise<OpenWithAppsResult>;
  openWithApp: (filePath: string, appPath: string) => Promise<void>;
  readLinkTarget: (linkPath: string) => Promise<string>;
  createSymlink: (targetPath: string, linkPath: string) => Promise<void>;
  getGitStatus: (dirPath: string) => Promise<GitStatusResult>;

  readTextPreview: (filePath: string) => Promise<TextPreviewResult>;

  remoteConnect: (config: RemoteConnectionConfig) => Promise<string>;
  remoteListDir: (id: string, dirPath: string) => Promise<RemoteEntry[]>;
  remoteDownload: (id: string, remotePath: string, localPath: string) => Promise<void>;
  remoteUpload: (id: string, localPath: string, remotePath: string) => Promise<void>;
  remoteMkdir: (id: string, dirPath: string) => Promise<void>;
  remoteRemove: (id: string, targetPath: string, isDirectory: boolean) => Promise<void>;
  remoteDisconnect: (id: string) => Promise<void>;

  getExif: (filePath: string) => Promise<ExifData | null>;
  resizeImage: (srcPath: string, destDir: string, width: number, height?: number) => Promise<string>;
  rotateImage: (srcPath: string, destDir: string, degrees: number) => Promise<string>;
  convertImage: (srcPath: string, destDir: string, format: "png" | "jpeg" | "webp" | "bmp") => Promise<string>;
  stripImageMetadata: (srcPath: string, destDir: string) => Promise<string>;
  batchImageOp: (
    paths: string[],
    destDir: string,
    op: { kind: "resize" | "rotate" | "convert"; width?: number; height?: number; degrees?: number; format?: "png" | "jpeg" | "webp" | "bmp" }
  ) => Promise<string[]>;

  splitFile: (filePath: string, chunkSizeBytes: number, destDir: string) => Promise<string[]>;
  mergeFiles: (partPaths: string[], destPath: string) => Promise<string>;

  startShare: (paths: string[]) => Promise<ShareInfo>;
  stopShare: () => Promise<void>;

  getAllNotes: () => Promise<Record<string, string>>;
  setNote: (filePath: string, text: string) => Promise<Record<string, string>>;

  listAutomationRules: () => Promise<AutomationRule[]>;
  addAutomationRule: (rule: AutomationRule) => Promise<AutomationRule[]>;
  removeAutomationRule: (id: string) => Promise<AutomationRule[]>;
  toggleAutomationRule: (id: string) => Promise<AutomationRule[]>;

  listPlugins: () => Promise<PluginInfo[]>;
  runPlugin: (id: string, context: { selectedPaths: string[]; currentPath: string }) => Promise<unknown>;
  openPluginsFolder: () => Promise<string>;

  compareDirs: (pathA: string, pathB: string) => Promise<CompareResult>;

  previewDocx: (filePath: string) => Promise<DocxPreview>;
  previewXlsx: (filePath: string) => Promise<XlsxPreview>;
  previewPptx: (filePath: string) => Promise<PptxPreview>;
  exportPreviewToPdf: (filePath: string, destPath: string) => Promise<string>;
  printFile: (filePath: string) => Promise<boolean>;

  listFavorites: () => Promise<FavoriteEntry[]>;
  addFavorite: (folderPath: string) => Promise<FavoriteEntry[]>;
  removeFavorite: (folderPath: string) => Promise<FavoriteEntry[]>;
  reorderFavorites: (orderedPaths: string[]) => Promise<FavoriteEntry[]>;

  newWindow: () => Promise<void>;
  getDiskSpace: (targetPath: string) => Promise<DiskSpace>;
  getFolderSizeQuick: (dirPath: string) => Promise<{ size: number; capped: boolean }>;

  searchContent: (rootDir: string, query: string, opId: string) => Promise<ContentSearchResult[]>;
  onSearchProgress: (callback: (p: { id: string; scanned: number; found: number }) => void) => () => void;

  onMenuAction: (callback: (action: string) => void) => () => void;

  listTemplates: () => Promise<{ name: string; path: string }[]>;
  createFromTemplate: (templatePath: string, destDir: string) => Promise<string>;
  openTemplatesFolder: () => Promise<string>;

  listTrash: () => Promise<TrashItem[]>;
  restoreTrashItem: (id: string, destPath: string) => Promise<void>;
  deleteTrashItemForever: (id: string) => Promise<void>;

  isParallelsAvailable: () => Promise<boolean>;
  listParallelsVms: () => Promise<ParallelsVm[]>;
  reconnectParallelsVm: (vmName: string) => Promise<void>;

  openSmbShare: (host: string, share?: string, user?: string) => Promise<void>;

  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  getCurrentVersion: () => Promise<string>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;

  getPdfPageCount: (filePath: string) => Promise<number>;
  mergePdfs: (filePaths: string[], destPath: string) => Promise<string>;
  extractPdfPages: (filePath: string, ranges: string, destPath: string) => Promise<string>;
  splitPdfEveryNPages: (filePath: string, pagesPerFile: number, destDir: string) => Promise<string[]>;
  rotatePdfPages: (filePath: string, degreesAmount: number, destPath: string, ranges?: string) => Promise<string>;
  imagesToPdf: (imagePaths: string[], destPath: string) => Promise<string>;
}

declare global {
  interface Window {
    fileAPI: FileAPI;
  }
}
