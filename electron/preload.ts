import { contextBridge, ipcRenderer } from "electron";
import type { FileEntry, OperationProgress } from "./shared/types";

export interface QuickAccessItem {
  name: string;
  path: string;
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

  showContextMenu: (
    items: { id: string; label: string; enabled?: boolean; type?: "separator" }[]
  ): Promise<string | null> => ipcRenderer.invoke("ui:contextMenu", items),
  confirmDelete: (names: string[]): Promise<boolean> => ipcRenderer.invoke("ui:confirmDelete", names),
};

contextBridge.exposeInMainWorld("fileAPI", api);

export type FileAPI = typeof api;
