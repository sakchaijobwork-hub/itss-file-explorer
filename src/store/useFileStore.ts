import { create } from "zustand";
import type { FileEntry, SortDirection, SortKey, Tab, TagColor, ViewMode } from "@/types";

let tabCounter = 0;
const newTabId = () => `tab-${++tabCounter}-${Date.now()}`;

interface ClipboardState {
  mode: "copy" | "cut" | null;
  paths: string[];
}

interface FileStoreState {
  tabs: Tab[];
  activeTabId: string;

  entries: FileEntry[];
  loading: boolean;
  error: string | null;

  selectedPaths: Set<string>;
  lastSelectedPath: string | null;

  clipboard: ClipboardState;
  recentlyPastedPaths: Set<string>;

  viewMode: ViewMode;
  sortKey: SortKey;
  sortDirection: SortDirection;
  showHidden: boolean;
  groupByKind: boolean;
  theme: "light" | "dark";
  themeMode: "light" | "dark" | "auto";

  renamingPath: string | null;

  initTabs: (home: string) => void;
  activeTab: () => Tab | undefined;
  setActiveTab: (id: string) => void;
  openTab: (path: string) => void;
  closeTab: (id: string) => void;
  setTabColor: (id: string, color: TagColor | undefined) => void;

  navigateTo: (path: string) => void;
  goBack: () => void;
  goForward: () => void;
  goUp: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;

  setEntries: (entries: FileEntry[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  select: (path: string, mode: "single" | "toggle" | "range") => void;
  selectAll: () => void;
  clearSelection: () => void;

  setClipboard: (mode: "copy" | "cut", paths: string[]) => void;
  clearClipboard: () => void;

  setRecentlyPasted: (paths: string[]) => void;
  clearRecentlyPasted: () => void;

  setViewMode: (mode: ViewMode) => void;
  setSort: (key: SortKey, direction?: SortDirection) => void;
  toggleHidden: () => void;
  toggleGroupByKind: () => void;
  toggleTheme: () => void;
  setThemeMode: (mode: "light" | "dark" | "auto") => void;
  setResolvedTheme: (theme: "light" | "dark") => void;

  startRename: (path: string) => void;
  endRename: () => void;
}

export const useFileStore = create<FileStoreState>((set, get) => ({
  tabs: [],
  activeTabId: "",

  entries: [],
  loading: false,
  error: null,

  selectedPaths: new Set(),
  lastSelectedPath: null,

  clipboard: { mode: null, paths: [] },
  recentlyPastedPaths: new Set(),

  viewMode: "grid",
  sortKey: "name",
  sortDirection: "asc",
  showHidden: false,
  groupByKind: false,
  theme: "dark",
  themeMode: "dark",

  renamingPath: null,

  initTabs: (home) => {
    if (get().tabs.length > 0) return;

    try {
      const raw = localStorage.getItem("itss-session-tabs");
      if (raw) {
        const saved = JSON.parse(raw) as { paths: string[]; activeIndex: number };
        if (Array.isArray(saved.paths) && saved.paths.length > 0) {
          const tabs = saved.paths.map((p) => ({ id: newTabId(), path: p, history: [p], historyIndex: 0 }));
          const activeIndex = Math.min(Math.max(saved.activeIndex ?? 0, 0), tabs.length - 1);
          set({ tabs, activeTabId: tabs[activeIndex].id });
          return;
        }
      }
    } catch {
      // ignore malformed session data
    }

    const id = newTabId();
    set({
      tabs: [{ id, path: home, history: [home], historyIndex: 0 }],
      activeTabId: id,
    });
  },

  activeTab: () => get().tabs.find((t) => t.id === get().activeTabId),

  setActiveTab: (id) => set({ activeTabId: id, selectedPaths: new Set() }),

  openTab: (path) => {
    const id = newTabId();
    set((s) => ({
      tabs: [...s.tabs, { id, path, history: [path], historyIndex: 0 }],
      activeTabId: id,
      selectedPaths: new Set(),
    }));
  },

  closeTab: (id) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return s;
      const tabs = s.tabs.filter((t) => t.id !== id);
      if (tabs.length === 0) return s; // keep at least one tab
      let activeTabId = s.activeTabId;
      if (activeTabId === id) {
        const fallback = tabs[Math.max(0, idx - 1)];
        activeTabId = fallback.id;
      }
      return { tabs, activeTabId };
    });
  },

  setTabColor: (id, color) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, color } : t)),
    }));
  },

  navigateTo: (path) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== s.activeTabId) return t;
        const history = t.history.slice(0, t.historyIndex + 1);
        history.push(path);
        return { ...t, path, history, historyIndex: history.length - 1 };
      }),
      selectedPaths: new Set(),
    }));
  },

  goBack: () => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== s.activeTabId || t.historyIndex <= 0) return t;
        const historyIndex = t.historyIndex - 1;
        return { ...t, path: t.history[historyIndex], historyIndex };
      }),
      selectedPaths: new Set(),
    }));
  },

  goForward: () => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== s.activeTabId || t.historyIndex >= t.history.length - 1) return t;
        const historyIndex = t.historyIndex + 1;
        return { ...t, path: t.history[historyIndex], historyIndex };
      }),
      selectedPaths: new Set(),
    }));
  },

  goUp: () => {
    const tab = get().activeTab();
    if (!tab) return;
    const parent = tab.path.replace(/[/\\][^/\\]+[/\\]?$/, "") || "/";
    get().navigateTo(parent || "/");
  },

  canGoBack: () => {
    const tab = get().activeTab();
    return !!tab && tab.historyIndex > 0;
  },
  canGoForward: () => {
    const tab = get().activeTab();
    return !!tab && tab.historyIndex < tab.history.length - 1;
  },

  setEntries: (entries) => set({ entries }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  select: (path, mode) => {
    set((s) => {
      const next = new Set(s.selectedPaths);
      if (mode === "single") {
        next.clear();
        next.add(path);
      } else if (mode === "toggle") {
        if (next.has(path)) next.delete(path);
        else next.add(path);
      } else if (mode === "range" && s.lastSelectedPath) {
        const paths = s.entries.map((e) => e.path);
        const a = paths.indexOf(s.lastSelectedPath);
        const b = paths.indexOf(path);
        if (a !== -1 && b !== -1) {
          const [start, end] = a < b ? [a, b] : [b, a];
          for (let i = start; i <= end; i++) next.add(paths[i]);
        } else {
          next.add(path);
        }
      }
      return { selectedPaths: next, lastSelectedPath: path };
    });
  },

  selectAll: () => set((s) => ({ selectedPaths: new Set(s.entries.map((e) => e.path)) })),
  clearSelection: () => set({ selectedPaths: new Set(), lastSelectedPath: null }),

  setClipboard: (mode, paths) => set({ clipboard: { mode, paths } }),
  clearClipboard: () => set({ clipboard: { mode: null, paths: [] } }),

  setRecentlyPasted: (paths) => set({ recentlyPastedPaths: new Set(paths) }),
  clearRecentlyPasted: () => set({ recentlyPastedPaths: new Set() }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setSort: (key, direction) =>
    set((s) => ({
      sortKey: key,
      sortDirection: direction ?? (s.sortKey === key && s.sortDirection === "asc" ? "desc" : "asc"),
    })),
  toggleHidden: () => set((s) => ({ showHidden: !s.showHidden })),
  toggleGroupByKind: () => set((s) => ({ groupByKind: !s.groupByKind })),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === "dark" ? "light" : "dark";
      return { theme, themeMode: theme };
    }),
  setThemeMode: (mode) =>
    set({
      themeMode: mode,
      theme: mode === "auto" ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode,
    }),
  setResolvedTheme: (theme) => set({ theme }),

  startRename: (path) => set({ renamingPath: path }),
  endRename: () => set({ renamingPath: null }),
}));

export function sortEntries(entries: FileEntry[], key: SortKey, direction: SortDirection): FileEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    let cmp = 0;
    switch (key) {
      case "name":
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        break;
      case "size":
        cmp = a.size - b.size;
        break;
      case "modifiedAt":
        cmp = a.modifiedAt - b.modifiedAt;
        break;
      case "type":
        cmp = a.extension.localeCompare(b.extension);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}
