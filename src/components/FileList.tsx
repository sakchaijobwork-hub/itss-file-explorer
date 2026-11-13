import { useMemo } from "react";
import clsx from "clsx";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useFileStore, sortEntries } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { useFileOperations } from "@/hooks/useFileOperations";
import { getFileIconComponent } from "@/utils/fileIcon";
import { formatBytes, formatDate } from "@/utils/format";
import { RenameInput } from "./RenameInput";
import type { FileEntry, SortKey, TagColor } from "@/types";
import { TAG_COLORS } from "@/types";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);

const TAG_HEX: Record<TagColor, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  gray: "#9ca3af",
};

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
  const tagsMap = useUiStore((s) => s.tagsMap);
  const toggleTag = useUiStore((s) => s.toggleTag);
  const openModal = useUiStore((s) => s.openModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

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
    const selectionCount = entry ? Math.max(selectedPaths.size, 1) : selectedPaths.size;
    const selectedList = entry && !selectedPaths.has(entry.path) ? [entry.path] : Array.from(selectedPaths);
    const singlePath = selectedList.length === 1 ? selectedList[0] : entry?.path;
    const currentTags = singlePath ? (tagsMap[singlePath] ?? []) : [];

    const items = entry
      ? [
          { id: "open", label: "Open" },
          { id: "showInFolder", label: "Show in Finder/Explorer" },
          { type: "separator" as const, id: "sep1", label: "" },
          { id: "cut", label: "Cut" },
          { id: "copy", label: "Copy" },
          { id: "paste", label: "Paste", enabled: clipboard.paths.length > 0 },
          { type: "separator" as const, id: "sep2", label: "" },
          { id: "rename", label: "Rename", enabled: selectionCount === 1 },
          {
            id: "batchRename",
            label: "Batch Rename…",
            enabled: selectionCount > 1,
          },
          { type: "separator" as const, id: "sep3", label: "" },
          {
            id: "tags",
            label: "Tags",
            submenu: TAG_COLORS.map((tag) => ({
              id: `tag:${tag}`,
              label: tag[0].toUpperCase() + tag.slice(1),
              checked: currentTags.includes(tag),
            })),
          },
          {
            id: "compress",
            label: "Compress to Zip",
          },
          {
            id: "extract",
            label: "Extract Here",
            enabled: selectionCount === 1 && entry.extension === "zip",
          },
          { type: "separator" as const, id: "sep4", label: "" },
          { id: "checksum", label: "Verify Checksum (2 files)…", enabled: selectionCount === 2 },
          { id: "permissions", label: "Permissions…", enabled: selectionCount === 1 },
          {
            id: "encrypt",
            label: "Encrypt…",
            enabled: !entry.isDirectory,
          },
          {
            id: "decrypt",
            label: "Decrypt…",
            enabled: selectionCount === 1 && entry.extension === "enc",
          },
          {
            id: "imageTools",
            label: "Image Tools…",
            enabled: selectedList.length > 0 && selectedList.every((p) => IMAGE_EXTS.has(p.split(".").pop()?.toLowerCase() ?? "")),
          },
          {
            id: "splitMerge",
            label: "Split / Merge…",
          },
          { id: "share", label: "Share on Local Network…" },
          { id: "notes", label: "Note…", enabled: selectionCount === 1 },
          { type: "separator" as const, id: "sep5", label: "" },
          { id: "delete", label: "Move to Trash" },
          { id: "shred", label: "Shred (permanently delete)" },
        ]
      : [
          { id: "newFolder", label: "New Folder" },
          { id: "newFile", label: "New File" },
          { id: "paste", label: "Paste", enabled: clipboard.paths.length > 0 },
          { type: "separator" as const, id: "sep1", label: "" },
          { id: "openTerminal", label: "Open Terminal Here" },
          { id: "remote", label: "Connect to FTP/SFTP/WebDAV…" },
          { id: "automation", label: "Folder Automation Rules…" },
          { id: "plugins", label: "Plugins…" },
          { id: "compare", label: "Compare / Sync Folders…" },
        ];

    const action = await window.fileAPI.showContextMenu(items);
    if (!action) return;

    if (action.startsWith("tag:")) {
      const tag = action.slice(4) as TagColor;
      if (singlePath) toggleTag(singlePath, tag);
      return;
    }

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
      case "batchRename":
        openModal("batchRename");
        break;
      case "compress": {
        if (!activeTab) break;
        const defaultPath = `${activeTab.path}/${entry?.name ?? "archive"}.zip`;
        const dest = await window.fileAPI.saveDialog(defaultPath, [{ name: "Zip Archive", extensions: ["zip"] }]);
        if (dest) await window.fileAPI.compress(selectedList, dest);
        break;
      }
      case "extract": {
        if (!entry || !activeTab) break;
        await window.fileAPI.extract(entry.path, activeTab.path);
        break;
      }
      case "checksum": {
        if (selectedList.length === 2) {
          const result = await window.fileAPI.verifyChecksum(selectedList[0], selectedList[1]);
          alert(result.match ? "Files are identical (checksum match)." : "Files differ (checksum mismatch).");
        }
        break;
      }
      case "permissions":
        if (singlePath) openModal("permissions", [singlePath]);
        break;
      case "encrypt":
        openModal("encrypt", selectedList);
        break;
      case "decrypt":
        if (singlePath) openModal("decrypt", [singlePath]);
        break;
      case "delete":
        deleteSelection(false);
        break;
      case "shred": {
        const names = selectedList.map((p) => p.split(/[/\\]/).pop() ?? p);
        const confirmed = await window.fileAPI.confirmDelete(names);
        if (confirmed) await window.fileAPI.shred(selectedList);
        break;
      }
      case "openTerminal":
        if (activeTab) window.fileAPI.openTerminal(activeTab.path);
        break;
      case "imageTools":
        openModal("imageTools", selectedList);
        break;
      case "splitMerge":
        openModal("splitMerge", selectedList);
        break;
      case "share":
        openModal("share", selectedList);
        break;
      case "notes":
        if (singlePath) openModal("notes", [singlePath]);
        break;
      case "remote":
        openModal("remote");
        break;
      case "automation":
        openModal("automation");
        break;
      case "plugins":
        openModal("plugins");
        break;
      case "compare":
        openModal("compare");
        break;
    }
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

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!activeTab || e.dataTransfer.files.length === 0) return;
    const paths = Array.from(e.dataTransfer.files).map((f) => window.fileAPI.getPathForFile(f));
    const opId = `drop-${Date.now()}`;
    await window.fileAPI.copy(paths, activeTab.path, opId);
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-2"
      onClick={clearSelection}
      onContextMenu={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) showContextMenu(null);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={handleDrop}
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
            tags={tagsMap[entry.path] ?? []}
            onSelect={(e) => select(entry.path, selectMode(e))}
            onOpen={() => handleOpen(entry)}
            onDragStart={(e) => {
              e.preventDefault();
              const paths = selectedPaths.has(entry.path) ? Array.from(selectedPaths) : [entry.path];
              window.fileAPI.startDrag(paths);
            }}
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

function TagDots({ tags }: { tags: TagColor[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {tags.map((tag) => (
        <span key={tag} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TAG_HEX[tag] }} />
      ))}
    </div>
  );
}

function FileItem({
  entry,
  viewMode,
  isSelected,
  isCut,
  isRenaming,
  tags,
  onSelect,
  onOpen,
  onContextMenu,
  onCommitRename,
  onCancelRename,
  onDragStart,
}: {
  entry: FileEntry;
  viewMode: "grid" | "list" | "details";
  isSelected: boolean;
  isCut: boolean;
  isRenaming: boolean;
  tags: TagColor[];
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onCommitRename: (value: string) => void;
  onCancelRename: () => void;
  onDragStart: (e: React.DragEvent) => void;
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
        draggable
        onDragStart={onDragStart}
        title={entry.name}
      >
        <Icon className={clsx("h-9 w-9", entry.isDirectory ? "text-accent" : "text-gray-500 dark:text-gray-400")} />
        <div className="w-full text-[11px] leading-tight text-gray-800 dark:text-gray-200">{nameNode}</div>
        <TagDots tags={tags} />
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
        draggable
        onDragStart={onDragStart}
      >
        <Icon className={clsx("h-4 w-4 shrink-0", entry.isDirectory ? "text-accent" : "text-gray-500 dark:text-gray-400")} />
        {nameNode}
        <TagDots tags={tags} />
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
      draggable
      onDragStart={onDragStart}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Icon className={clsx("h-4 w-4 shrink-0", entry.isDirectory ? "text-accent" : "text-gray-500 dark:text-gray-400")} />
        {nameNode}
        <TagDots tags={tags} />
      </div>
      <div className="text-xs text-gray-500">{entry.isDirectory ? "—" : formatBytes(entry.size)}</div>
      <div className="text-xs text-gray-500">{formatDate(entry.modifiedAt)}</div>
      <div className="text-xs text-gray-500">{entry.isDirectory ? "Folder" : entry.extension || "File"}</div>
    </div>
  );
}
