import { create } from "zustand";
import type { FavoriteEntry, TagColor } from "@/types";
import { dirname } from "@/utils/format";

export type ModalKind =
  | null
  | "duplicates"
  | "storage"
  | "batchRename"
  | "permissions"
  | "encrypt"
  | "decrypt"
  | "recents"
  | "remote"
  | "imageTools"
  | "splitMerge"
  | "share"
  | "notes"
  | "automation"
  | "plugins"
  | "compare"
  | "contentSearch"
  | "shortcuts"
  | "settings"
  | "trash"
  | "pdfTools"
  | "properties"
  | "about";

export type UndoAction =
  | { type: "rename"; oldPath: string; newPath: string }
  | { type: "move"; items: { from: string; to: string }[] }
  | { type: "copy"; sourcePaths: string[]; createdPaths: string[]; destDir: string };

const MAX_UNDO_STACK = 20;

interface UiState {
  commandPaletteOpen: boolean;
  previewOpen: boolean;
  dualPane: boolean;
  modal: ModalKind;
  modalTargetPaths: string[];
  quickLookPath: string | null;
  gridIconSize: number;
  addressBarEditing: boolean;
  undoStack: UndoAction[];
  redoStack: UndoAction[];

  tagsMap: Record<string, TagColor[]>;
  favorites: FavoriteEntry[];

  setCommandPaletteOpen: (open: boolean) => void;
  togglePreview: () => void;
  toggleDualPane: () => void;
  openModal: (modal: Exclude<ModalKind, null>, targetPaths?: string[]) => void;
  closeModal: () => void;
  openQuickLook: (filePath: string) => void;
  closeQuickLook: () => void;
  setGridIconSize: (size: number) => void;
  setAddressBarEditing: (editing: boolean) => void;
  pushUndoAction: (action: UndoAction) => void;
  popUndo: () => UndoAction | undefined;
  popRedo: () => UndoAction | undefined;
  pushRedoAction: (action: UndoAction) => void;
  pushUndoBack: (action: UndoAction) => void;

  loadTags: () => Promise<void>;
  toggleTag: (filePath: string, tag: TagColor) => Promise<void>;

  loadFavorites: () => Promise<void>;
  addFavorite: (targetPath: string, isDirectory?: boolean) => Promise<void>;
  removeFavorite: (targetPath: string) => Promise<void>;
  toggleFavorite: (targetPath: string, isDirectory: boolean) => Promise<void>;
  reorderFavorites: (orderedPaths: string[]) => Promise<void>;
}

export const useUiStore = create<UiState>((set, get) => ({
  commandPaletteOpen: false,
  previewOpen: false,
  dualPane: false,
  modal: null,
  modalTargetPaths: [],
  quickLookPath: null,
  gridIconSize: 96,
  addressBarEditing: false,
  undoStack: [],
  redoStack: [],

  tagsMap: {},
  favorites: [],

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  togglePreview: () => set((s) => ({ previewOpen: !s.previewOpen })),
  toggleDualPane: () => set((s) => ({ dualPane: !s.dualPane })),
  openModal: (modal, targetPaths = []) => set({ modal, modalTargetPaths: targetPaths }),
  closeModal: () => set({ modal: null, modalTargetPaths: [] }),
  openQuickLook: (filePath) => set({ quickLookPath: filePath }),
  closeQuickLook: () => set({ quickLookPath: null }),
  setGridIconSize: (size) => set({ gridIconSize: size }),
  setAddressBarEditing: (editing) => set({ addressBarEditing: editing }),

  pushUndoAction: (action) =>
    set((s) => ({ undoStack: [...s.undoStack, action].slice(-MAX_UNDO_STACK), redoStack: [] })),
  popUndo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return undefined;
    const action = stack[stack.length - 1];
    set({ undoStack: stack.slice(0, -1) });
    return action;
  },
  popRedo: () => {
    const stack = get().redoStack;
    if (stack.length === 0) return undefined;
    const action = stack[stack.length - 1];
    set({ redoStack: stack.slice(0, -1) });
    return action;
  },
  pushRedoAction: (action) => set((s) => ({ redoStack: [...s.redoStack, action].slice(-MAX_UNDO_STACK) })),
  pushUndoBack: (action) => set((s) => ({ undoStack: [...s.undoStack, action].slice(-MAX_UNDO_STACK) })),

  loadTags: async () => {
    const tagsMap = await window.fileAPI.getAllTags();
    set({ tagsMap });
  },
  toggleTag: async (filePath, tag) => {
    const tagsMap = await window.fileAPI.toggleTag(filePath, tag);
    set({ tagsMap });
    void get;
  },

  loadFavorites: async () => {
    const favorites = await window.fileAPI.listFavorites();
    set({ favorites });
  },
  // Favoriting a file also needs its parent folder pinned, since a
  // favorited file is only ever shown nested under its folder in the
  // sidebar's favorites tree — so a lone favorited file would otherwise
  // have nowhere to appear.
  addFavorite: async (targetPath, isDirectory = true) => {
    if (!isDirectory) {
      const parent = dirname(targetPath);
      if (!get().favorites.some((f) => f.path === parent && f.isDirectory)) {
        const favorites = await window.fileAPI.addFavorite(parent, true);
        set({ favorites });
      }
    }
    const favorites = await window.fileAPI.addFavorite(targetPath, isDirectory);
    set({ favorites });
  },
  removeFavorite: async (targetPath) => {
    const favorites = await window.fileAPI.removeFavorite(targetPath);
    set({ favorites });
  },
  toggleFavorite: async (targetPath, isDirectory) => {
    const isFavorite = get().favorites.some((f) => f.path === targetPath);
    if (isFavorite) await get().removeFavorite(targetPath);
    else await get().addFavorite(targetPath, isDirectory);
  },
  reorderFavorites: async (orderedPaths) => {
    // Apply the new order immediately so dragging feels instant; the
    // IPC result (same order, re-read from disk) then confirms it.
    const byPath = new Map(get().favorites.map((f) => [f.path, f]));
    const optimistic = orderedPaths.map((p) => byPath.get(p)).filter((f): f is FavoriteEntry => !!f);
    set({ favorites: optimistic });
    const favorites = await window.fileAPI.reorderFavorites(orderedPaths);
    set({ favorites });
  },
}));
