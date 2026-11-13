import { useCallback } from "react";
import { useFileStore } from "@/store/useFileStore";

let opCounter = 0;

export function useFileOperations() {
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const entries = useFileStore((s) => s.entries);
  const clipboard = useFileStore((s) => s.clipboard);
  const setClipboard = useFileStore((s) => s.setClipboard);
  const clearClipboard = useFileStore((s) => s.clearClipboard);
  const startRename = useFileStore((s) => s.startRename);
  const clearSelection = useFileStore((s) => s.clearSelection);
  const select = useFileStore((s) => s.select);

  const currentPath = activeTab?.path ?? "";

  const copySelection = useCallback(() => {
    setClipboard("copy", Array.from(selectedPaths));
  }, [selectedPaths, setClipboard]);

  const cutSelection = useCallback(() => {
    setClipboard("cut", Array.from(selectedPaths));
  }, [selectedPaths, setClipboard]);

  const paste = useCallback(async () => {
    if (clipboard.paths.length === 0) return;
    const opId = `op-${++opCounter}`;
    if (clipboard.mode === "copy") {
      await window.fileAPI.copy(clipboard.paths, currentPath, opId);
    } else if (clipboard.mode === "cut") {
      await window.fileAPI.move(clipboard.paths, currentPath, opId);
      clearClipboard();
    }
  }, [clipboard, currentPath, clearClipboard]);

  const deleteSelection = useCallback(async (permanent = false) => {
    const paths = Array.from(selectedPaths);
    if (paths.length === 0) return;
    const names = paths.map((p) => entries.find((e) => e.path === p)?.name ?? p);
    const confirmed = await window.fileAPI.confirmDelete(names);
    if (!confirmed) return;
    if (permanent) {
      await window.fileAPI.deletePermanent(paths);
    } else {
      await window.fileAPI.deleteToTrash(paths);
    }
    clearSelection();
  }, [selectedPaths, entries, clearSelection]);

  const createNewFolder = useCallback(async () => {
    let name = "New Folder";
    let n = 1;
    const existingNames = new Set(entries.map((e) => e.name));
    while (existingNames.has(name)) {
      name = `New Folder ${++n}`;
    }
    const target = await window.fileAPI.createFolder(currentPath, name);
    startRename(target);
    select(target, "single");
  }, [currentPath, entries, startRename, select]);

  const createNewFile = useCallback(async () => {
    let name = "New File.txt";
    let n = 1;
    const existingNames = new Set(entries.map((e) => e.name));
    while (existingNames.has(name)) {
      name = `New File ${++n}.txt`;
    }
    const target = await window.fileAPI.createFile(currentPath, name);
    startRename(target);
    select(target, "single");
  }, [currentPath, entries, startRename, select]);

  const renameEntry = useCallback(async (oldPath: string, newName: string) => {
    if (!newName.trim()) return;
    await window.fileAPI.rename(oldPath, newName.trim());
  }, []);

  const openEntry = useCallback(
    (path: string) => {
      window.fileAPI.openPath(path);
      window.fileAPI.addRecent(path);
    },
    []
  );

  return {
    copySelection,
    cutSelection,
    paste,
    deleteSelection,
    createNewFolder,
    createNewFile,
    renameEntry,
    openEntry,
  };
}
