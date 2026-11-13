import { create } from "zustand";
import type { TagColor } from "@/types";

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
}));
