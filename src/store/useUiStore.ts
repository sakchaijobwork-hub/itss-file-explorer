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
  | "about";

interface UiState {
  commandPaletteOpen: boolean;
  previewOpen: boolean;
  dualPane: boolean;
  modal: ModalKind;
  modalTargetPaths: string[];
  quickLookPath: string | null;
  gridIconSize: number;

  tagsMap: Record<string, TagColor[]>;

  setCommandPaletteOpen: (open: boolean) => void;
  togglePreview: () => void;
  toggleDualPane: () => void;
  openModal: (modal: Exclude<ModalKind, null>, targetPaths?: string[]) => void;
  closeModal: () => void;
  openQuickLook: (filePath: string) => void;
  closeQuickLook: () => void;
  setGridIconSize: (size: number) => void;

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

  tagsMap: {},

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  togglePreview: () => set((s) => ({ previewOpen: !s.previewOpen })),
  toggleDualPane: () => set((s) => ({ dualPane: !s.dualPane })),
  openModal: (modal, targetPaths = []) => set({ modal, modalTargetPaths: targetPaths }),
  closeModal: () => set({ modal: null, modalTargetPaths: [] }),
  openQuickLook: (filePath) => set({ quickLookPath: filePath }),
  closeQuickLook: () => set({ quickLookPath: null }),
  setGridIconSize: (size) => set({ gridIconSize: size }),

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
