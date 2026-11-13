import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Grid2x2,
  List,
  Rows3,
  FolderPlus,
  Sun,
  Moon,
  Copy as CopyIcon,
  HardDrive,
  Columns2,
  Eye,
  Terminal,
  Clock,
  Search,
  Server,
  Zap,
  Puzzle,
  GitCompare,
  AppWindow,
  FileSearch,
  Undo2,
  Redo2,
  Settings,
} from "lucide-react";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import { useFileOperations } from "@/hooks/useFileOperations";

interface Command {
  id: string;
  label: string;
  icon: typeof Grid2x2;
  run: () => void;
}

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const setViewMode = useFileStore((s) => s.setViewMode);
  const toggleTheme = useFileStore((s) => s.toggleTheme);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const togglePreview = useUiStore((s) => s.togglePreview);
  const toggleDualPane = useUiStore((s) => s.toggleDualPane);
  const openModal = useUiStore((s) => s.openModal);
  const { createNewFolder, performUndo, canUndo, performRedo, canRedo } = useFileOperations();

  const commands = useMemo<Command[]>(
    () => [
      { id: "view-grid", label: "View: Grid", icon: Grid2x2, run: () => setViewMode("grid") },
      { id: "view-list", label: "View: List", icon: List, run: () => setViewMode("list") },
      { id: "view-details", label: "View: Details", icon: Rows3, run: () => setViewMode("details") },
      { id: "new-folder", label: "New Folder", icon: FolderPlus, run: () => createNewFolder() },
      ...(canUndo ? [{ id: "undo", label: "Undo Last Action", icon: Undo2, run: () => performUndo() }] : []),
      ...(canRedo ? [{ id: "redo", label: "Redo", icon: Redo2, run: () => performRedo() }] : []),
      { id: "theme", label: "Toggle Light / Dark Theme", icon: Sun, run: () => toggleTheme() },
      { id: "dual-pane", label: "Toggle Dual Pane", icon: Columns2, run: () => toggleDualPane() },
      { id: "preview", label: "Toggle Preview Panel", icon: Eye, run: () => togglePreview() },
      { id: "duplicates", label: "Find Duplicate Files…", icon: CopyIcon, run: () => openModal("duplicates") },
      { id: "storage", label: "Analyze Storage…", icon: HardDrive, run: () => openModal("storage") },
      { id: "recents", label: "Show Recent Files…", icon: Clock, run: () => openModal("recents") },
      {
        id: "terminal",
        label: "Open Terminal Here",
        icon: Terminal,
        run: () => activeTab && window.fileAPI.openTerminal(activeTab.path),
      },
      { id: "remote", label: "Connect to FTP/SFTP/WebDAV…", icon: Server, run: () => openModal("remote") },
      { id: "automation", label: "Folder Automation Rules…", icon: Zap, run: () => openModal("automation") },
      { id: "plugins", label: "Plugins…", icon: Puzzle, run: () => openModal("plugins") },
      { id: "settings", label: "Settings…", icon: Settings, run: () => openModal("settings") },
      { id: "compare", label: "Compare / Sync Folders…", icon: GitCompare, run: () => openModal("compare") },
      { id: "newWindow", label: "New Window", icon: AppWindow, run: () => window.fileAPI.newWindow() },
      { id: "contentSearch", label: "Search File Contents…", icon: FileSearch, run: () => openModal("contentSearch") },
    ],
    [setViewMode, createNewFolder, performUndo, canUndo, performRedo, canRedo, toggleTheme, toggleDualPane, togglePreview, openModal, activeTab]
  );

  const filtered = useMemo(
    () => commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!open) return null;

  function runAt(i: number) {
    const cmd = filtered[i];
    if (cmd) {
      cmd.run();
      setOpen(false);
    }
  }

  return createPortal(
    <div
      className="no-drag fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-32"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-[480px] overflow-hidden rounded-xl bg-surface-light shadow-2xl dark:bg-[#2a2a2a]">
        <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2.5 dark:border-white/10">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runAt(index);
              }
            }}
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => runAt(i)}
              onMouseEnter={() => setIndex(i)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm ${
                i === index ? "bg-accent/15 text-accent" : "text-gray-700 dark:text-gray-200"
              }`}
            >
              <cmd.icon className="h-4 w-4" />
              {cmd.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-gray-400">No matching commands</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
