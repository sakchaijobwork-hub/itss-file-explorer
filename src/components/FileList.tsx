import { useMemo } from "react";
import clsx from "clsx";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useFileStore, sortEntries } from "@/store/useFileStore";
import { useFileOperations } from "@/hooks/useFileOperations";
import { getFileIconComponent } from "@/utils/fileIcon";
import { formatBytes, formatDate } from "@/utils/format";
import { RenameInput } from "./RenameInput";
import type { FileEntry, SortKey } from "@/types";

function selectMode(e: React.MouseEvent): "single" | "toggle" | "range" {
  if (e.shiftKey) return "range";
  if (e.metaKey || e.ctrlKey) return "toggle";
  return "single";
}

export function FileList({ searchQuery }: { searchQuery: string }) {
  const entries = useFileStore((s) => s.entries);
  const loading = useFileStore((s) => s.loading);
  const error = useFileStore((s) => s.error);
  const viewMode = useFileStore((s) => s.viewMode);
  const sortKey = useFileStore((s) => s.sortKey);
  const sortDirection = useFileStore((s) => s.sortDirection);
  const setSort = useFileStore((s) => s.setSort);
  const showHidden = useFileStore((s) => s.showHidden);
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const select = useFileStore((s) => s.select);
  const clearSelection = useFileStore((s) => s.clearSelection);
  const renamingPath = useFileStore((s) => s.renamingPath);
  const startRename = useFileStore((s) => s.startRename);
  const endRename = useFileStore((s) => s.endRename);
  const navigateTo = useFileStore((s) => s.navigateTo);
  const setClipboard = useFileStore((s) => s.setClipboard);
  const clipboard = useFileStore((s) => s.clipboard);

  const { renameEntry, openEntry, deleteSelection, copySelection, cutSelection, paste } =
    useFileOperations();

  const visibleEntries = useMemo(() => {
    let list = entries;
    if (!showHidden) list = list.filter((e) => !e.hidden);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return sortEntries(list, sortKey, sortDirection);
  }, [entries, showHidden, searchQuery, sortKey, sortDirection]);

  async function handleOpen(entry: FileEntry) {
    if (entry.isDirectory) navigateTo(entry.path);
    else openEntry(entry.path);
  }

  async function showContextMenu(entry: FileEntry | null) {
    if (entry && !selectedPaths.has(entry.path)) select(entry.path, "single");
    const hasSelection = entry ? true : selectedPaths.size > 0;
    const items = entry
      ? [
          { id: "open", label: entry.isDirectory ? "Open" : "Open" },
          { id: "showInFolder", label: "Show in Folder" },
          { type: "separator" as const, id: "sep1", label: "" },
          { id: "cut", label: "Cut" },
          { id: "copy", label: "Copy" },
          { id: "paste", label: "Paste", enabled: clipboard.paths.length > 0 },
          { type: "separator" as const, id: "sep2", label: "" },
          { id: "rename", label: "Rename" },
          { id: "delete", label: "Move to Trash" },
        ]
      : [
          { id: "newFolder", label: "New Folder" },
          { id: "newFile", label: "New File" },
          { id: "paste", label: "Paste", enabled: clipboard.paths.length > 0 },
        ];

    const action = await window.fileAPI.showContextMenu(items);
    if (!action) return;

    switch (action) {
      case "open":
        if (entry) handleOpen(entry);
        break;
      case "showInFolder":
        if (entry) window.fileAPI.showInFolder(entry.path);
        break;
      case "cut":
        cutSelection();
        break;
      case "copy":
        copySelection();
        break;
      case "paste":
        paste();
        break;
      case "rename":
        if (entry) startRename(entry.path);
        break;
      case "delete":
        deleteSelection(false);
        break;
    }
    void hasSelection;
  }

  if (loading && entries.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-gray-400">Loading…</div>;
  }
  if (error) {
    return <div className="flex flex-1 items-center justify-center text-sm text-red-400">{error}</div>;
  }
  if (visibleEntries.length === 0) {
    return (
      <div
        className="flex flex-1 items-center justify-center text-sm text-gray-400"
        onContextMenu={(e) => {
          e.preventDefault();
          showContextMenu(null);
        }}
        onClick={clearSelection}
      >
        This folder is empty
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-2"
      onClick={clearSelection}
      onContextMenu={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) showContextMenu(null);
      }}
    >
      {viewMode === "details" && (
        <DetailsHeader sortKey={sortKey} sortDirection={sortDirection} onSort={setSort} />
      )}
      <div
        className={clsx(
          viewMode === "grid" && "grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1",
          viewMode === "list" && "flex flex-col gap-0.5",
          viewMode === "details" && "flex flex-col"
        )}
      >
        {visibleEntries.map((entry) => (
          <FileItem
            key={entry.path}
            entry={entry}
            viewMode={viewMode}
            isSelected={selectedPaths.has(entry.path)}
            isCut={clipboard.mode === "cut" && clipboard.paths.includes(entry.path)}
            isRenaming={renamingPath === entry.path}
            onSelect={(e) => select(entry.path, selectMode(e))}
            onOpen={() => handleOpen(entry)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              showContextMenu(entry);
            }}
            onCommitRename={async (value) => {
              if (value && value !== entry.name) await renameEntry(entry.path, value);
              endRename();
            }}
            onCancelRename={endRename}
          />
        ))}
      </div>
    </div>
  );
}

function DetailsHeader({
  sortKey,
  sortDirection,
  onSort,
}: {
  sortKey: SortKey;
  sortDirection: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const Col = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <button
      onClick={() => onSort(k)}
      className={clsx(
        "flex items-center gap-1 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
        className
      )}
    >
      {label}
      {sortKey === k && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );
  return (
    <div className="grid grid-cols-[1fr_100px_160px_80px] items-center border-b border-black/5 dark:border-white/5">
      <Col label="Name" k="name" />
      <Col label="Size" k="size" />
      <Col label="Modified" k="modifiedAt" />
      <Col label="Type" k="type" />
    </div>
  );
}

function FileItem({
  entry,
  viewMode,
  isSelected,
  isCut,
  isRenaming,
  onSelect,
  onOpen,
  onContextMenu,
  onCommitRename,
  onCancelRename,
}: {
  entry: FileEntry;
  viewMode: "grid" | "list" | "details";
  isSelected: boolean;
  isCut: boolean;
  isRenaming: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onCommitRename: (value: string) => void;
  onCancelRename: () => void;
}) {
  const Icon = getFileIconComponent(entry.extension, entry.isDirectory);
  const inputClass =
    "w-full rounded border border-accent bg-white px-1 text-xs text-black outline-none dark:bg-neutral-800 dark:text-white";

  const nameNode = isRenaming ? (
    <RenameInput defaultValue={entry.name} onCommit={onCommitRename} onCancel={onCancelRename} className={inputClass} />
  ) : (
    <span className="truncate">{entry.name}</span>
  );

  const baseClasses = clsx(
    "group cursor-default select-none rounded-md transition-colors",
    isSelected ? "bg-accent/20 ring-1 ring-accent/40" : "hover:bg-black/5 dark:hover:bg-white/5",
    isCut && "opacity-50"
  );

  if (viewMode === "grid") {
    return (
      <div
        className={clsx(baseClasses, "flex flex-col items-center gap-1 p-2 text-center")}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e);
        }}
        onDoubleClick={onOpen}
        onContextMenu={onContextMenu}
        title={entry.name}
      >
        <Icon className={clsx("h-9 w-9", entry.isDirectory ? "text-accent" : "text-gray-500 dark:text-gray-400")} />
        <div className="w-full text-[11px] leading-tight text-gray-800 dark:text-gray-200">{nameNode}</div>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div
        className={clsx(baseClasses, "flex items-center gap-2 px-2 py-1 text-[13px] text-gray-800 dark:text-gray-200")}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e);
        }}
        onDoubleClick={onOpen}
        onContextMenu={onContextMenu}
      >
        <Icon className={clsx("h-4 w-4 shrink-0", entry.isDirectory ? "text-accent" : "text-gray-500 dark:text-gray-400")} />
        {nameNode}
      </div>
    );
  }

  // details
  return (
    <div
      className={clsx(baseClasses, "grid grid-cols-[1fr_100px_160px_80px] items-center px-2 py-1 text-[13px] text-gray-800 dark:text-gray-200")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Icon className={clsx("h-4 w-4 shrink-0", entry.isDirectory ? "text-accent" : "text-gray-500 dark:text-gray-400")} />
        {nameNode}
      </div>
      <div className="text-xs text-gray-500">{entry.isDirectory ? "—" : formatBytes(entry.size)}</div>
      <div className="text-xs text-gray-500">{formatDate(entry.modifiedAt)}</div>
      <div className="text-xs text-gray-500">{entry.isDirectory ? "Folder" : entry.extension || "File"}</div>
    </div>
  );
}
