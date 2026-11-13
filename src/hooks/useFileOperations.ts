import { useCallback } from "react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { basename, joinPath } from "@/utils/format";

let opCounter = 0;

function dirnameOf(p: string): string {
  return p.replace(/[/\\][^/\\]+[/\\]?$/, "") || "/";
}

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
  const lastAction = useUiStore((s) => s.lastAction);
  const setLastAction = useUiStore((s) => s.setLastAction);

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
      setLastAction({
        type: "copy",
        createdPaths: clipboard.paths.map((p) => joinPath(currentPath, basename(p))),
      });
    } else if (clipboard.mode === "cut") {
      const items = clipboard.paths.map((p) => ({ from: p, to: joinPath(currentPath, basename(p)) }));
      await window.fileAPI.move(clipboard.paths, currentPath, opId);
      setLastAction({ type: "move", items });
      clearClipboard();
    }
  }, [clipboard, currentPath, clearClipboard, setLastAction]);

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

  const renameEntry = useCallback(
    async (oldPath: string, newName: string) => {
      if (!newName.trim()) return;
      await window.fileAPI.rename(oldPath, newName.trim());
      setLastAction({ type: "rename", oldPath, newPath: joinPath(dirnameOf(oldPath), newName.trim()) });
    },
    [setLastAction]
  );

  const openEntry = useCallback(
    (path: string) => {
      window.fileAPI.openPath(path);
      window.fileAPI.addRecent(path);
    },
    []
  );

  const performUndo = useCallback(async () => {
    if (!lastAction) return;
    const opId = `undo-${++opCounter}`;
    if (lastAction.type === "rename") {
      await window.fileAPI.rename(lastAction.newPath, basename(lastAction.oldPath));
    } else if (lastAction.type === "move") {
      for (const item of lastAction.items) {
        await window.fileAPI.move([item.to], dirnameOf(item.from), opId);
      }
    } else if (lastAction.type === "copy") {
      await window.fileAPI.deleteToTrash(lastAction.createdPaths);
    }
    setLastAction(null);
  }, [lastAction, setLastAction]);

  return {
    copySelection,
    cutSelection,
    paste,
    deleteSelection,
    createNewFolder,
    createNewFile,
    renameEntry,
    openEntry,
    performUndo,
    canUndo: lastAction !== null,
  };
}
