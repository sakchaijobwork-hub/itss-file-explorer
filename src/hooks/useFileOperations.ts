import { useCallback } from "react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import type { UndoAction } from "@/store/useUiStore";
import { basename, joinPath } from "@/utils/format";
import { loadSettings } from "@/utils/settings";

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
  const undoStackLength = useUiStore((s) => s.undoStack.length);
  const redoStackLength = useUiStore((s) => s.redoStack.length);
  const pushUndoAction = useUiStore((s) => s.pushUndoAction);
  const popUndo = useUiStore((s) => s.popUndo);
  const popRedo = useUiStore((s) => s.popRedo);
  const pushRedoAction = useUiStore((s) => s.pushRedoAction);
  const pushUndoBack = useUiStore((s) => s.pushUndoBack);

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
      pushUndoAction({
        type: "copy",
        sourcePaths: clipboard.paths,
        createdPaths: clipboard.paths.map((p) => joinPath(currentPath, basename(p))),
        destDir: currentPath,
      });
    } else if (clipboard.mode === "cut") {
      const items = clipboard.paths.map((p) => ({ from: p, to: joinPath(currentPath, basename(p)) }));
      await window.fileAPI.move(clipboard.paths, currentPath, opId);
      pushUndoAction({ type: "move", items });
      clearClipboard();
    }
  }, [clipboard, currentPath, clearClipboard, pushUndoAction]);

  const deleteSelection = useCallback(async (permanent = false) => {
    const paths = Array.from(selectedPaths);
    if (paths.length === 0) return;
    const names = paths.map((p) => entries.find((e) => e.path === p)?.name ?? p);
    const needsConfirm = permanent || loadSettings().confirmBeforeTrash;
    const confirmed = needsConfirm ? await window.fileAPI.confirmDelete(names) : true;
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
      pushUndoAction({ type: "rename", oldPath, newPath: joinPath(dirnameOf(oldPath), newName.trim()) });
    },
    [pushUndoAction]
  );

  const openEntry = useCallback(
    (path: string) => {
      window.fileAPI.openPath(path);
      window.fileAPI.addRecent(path);
    },
    []
  );

  const applyBackward = useCallback(async (action: UndoAction) => {
    const opId = `undo-${++opCounter}`;
    if (action.type === "rename") {
      await window.fileAPI.rename(action.newPath, basename(action.oldPath));
    } else if (action.type === "move") {
      for (const item of action.items) {
        await window.fileAPI.move([item.to], dirnameOf(item.from), opId);
      }
    } else if (action.type === "copy") {
      await window.fileAPI.deleteToTrash(action.createdPaths);
    }
  }, []);

  const applyForward = useCallback(async (action: UndoAction) => {
    const opId = `redo-${++opCounter}`;
    if (action.type === "rename") {
      await window.fileAPI.rename(action.oldPath, basename(action.newPath));
    } else if (action.type === "move") {
      for (const item of action.items) {
        await window.fileAPI.move([item.from], dirnameOf(item.to), opId);
      }
    } else if (action.type === "copy") {
      await window.fileAPI.copy(action.sourcePaths, action.destDir, opId);
    }
  }, []);

  const performUndo = useCallback(async () => {
    const action = popUndo();
    if (!action) return;
    await applyBackward(action);
    pushRedoAction(action);
  }, [popUndo, applyBackward, pushRedoAction]);

  const performRedo = useCallback(async () => {
    const action = popRedo();
    if (!action) return;
    await applyForward(action);
    pushUndoBack(action);
  }, [popRedo, applyForward, pushUndoBack]);

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
    performRedo,
    canUndo: undoStackLength > 0,
    canRedo: redoStackLength > 0,
  };
}
