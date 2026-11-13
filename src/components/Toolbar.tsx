import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RotateCw,
  Grid2x2,
  List,
  Rows3,
  Columns3,
  FolderPlus,
  FilePlus,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Search,
  FileSearch,
  Columns2,
  Copy as CopyIcon,
  HardDrive,
  Terminal,
  Clock,
  Command,
} from "lucide-react";
import clsx from "clsx";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { useFileOperations } from "@/hooks/useFileOperations";

function ToolbarButton({
  onClick,
  disabled,
  title,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        disabled
          ? "cursor-default opacity-30"
          : "hover:bg-black/5 dark:hover:bg-white/10",
        active && "bg-accent/15 text-accent"
      )}
    >
      {children}
    </button>
  );
}

export function Toolbar({ onSearch }: { onSearch: (q: string) => void }) {
  const goBack = useFileStore((s) => s.goBack);
  const goForward = useFileStore((s) => s.goForward);
  const goUp = useFileStore((s) => s.goUp);
  const canGoBack = useFileStore((s) => s.canGoBack());
  const canGoForward = useFileStore((s) => s.canGoForward());
  const viewMode = useFileStore((s) => s.viewMode);
  const setViewMode = useFileStore((s) => s.setViewMode);
  const showHidden = useFileStore((s) => s.showHidden);
  const toggleHidden = useFileStore((s) => s.toggleHidden);
  const theme = useFileStore((s) => s.theme);
  const toggleTheme = useFileStore((s) => s.toggleTheme);
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const clipboard = useFileStore((s) => s.clipboard);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

  const dualPane = useUiStore((s) => s.dualPane);
  const gridIconSize = useUiStore((s) => s.gridIconSize);
  const setGridIconSize = useUiStore((s) => s.setGridIconSize);
  const toggleDualPane = useUiStore((s) => s.toggleDualPane);
  const previewOpen = useUiStore((s) => s.previewOpen);
  const togglePreview = useUiStore((s) => s.togglePreview);
  const openModal = useUiStore((s) => s.openModal);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  const { copySelection, cutSelection, paste, deleteSelection, createNewFolder, createNewFile } =
    useFileOperations();

  const hasSelection = selectedPaths.size > 0;

  const refresh = () => {
    if (activeTab) window.fileAPI.readDir(activeTab.path);
  };

  return (
    <div className="no-drag flex h-11 items-center gap-1 border-b border-black/5 bg-surface-light px-2 dark:border-white/5 dark:bg-surface-dark">
      <ToolbarButton onClick={goBack} disabled={!canGoBack} title="Back">
        <ChevronLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={goForward} disabled={!canGoForward} title="Forward">
        <ChevronRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={goUp} title="Up">
        <ChevronUp className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={refresh} title="Refresh">
        <RotateCw className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

      <ToolbarButton onClick={createNewFolder} title="New Folder">
        <FolderPlus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={createNewFile} title="New File">
        <FilePlus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={copySelection} disabled={!hasSelection} title="Copy">
        <Copy className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={cutSelection} disabled={!hasSelection} title="Cut">
        <Scissors className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={paste} disabled={clipboard.paths.length === 0} title="Paste">
        <Clipboard className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => deleteSelection(false)} disabled={!hasSelection} title="Move to Trash">
        <Trash2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

      <div className="relative flex-1 max-w-xs">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search in this folder"
          className="h-7 w-full rounded-md bg-black/5 pl-7 pr-2 text-xs outline-none placeholder:text-gray-400 focus:bg-black/10 dark:bg-white/5 dark:focus:bg-white/10"
        />
      </div>
      <ToolbarButton onClick={() => openModal("contentSearch")} title="Search File Contents (⌘⇧F)">
        <FileSearch className="h-4 w-4" />
      </ToolbarButton>

      <div className="flex-1" />

      <ToolbarButton onClick={() => setViewMode("grid")} active={viewMode === "grid"} title="Grid View">
        <Grid2x2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => setViewMode("list")} active={viewMode === "list"} title="List View">
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => setViewMode("details")} active={viewMode === "details"} title="Details View">
        <Rows3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => setViewMode("columns")} active={viewMode === "columns"} title="Column View">
        <Columns3 className="h-4 w-4" />
      </ToolbarButton>

      {viewMode === "grid" && (
        <input
          type="range"
          min={72}
          max={160}
          step={8}
          value={gridIconSize}
          onChange={(e) => setGridIconSize(Number(e.target.value))}
          title="Icon size"
          className="mx-1 h-1.5 w-16 accent-accent"
        />
      )}

      <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

      <ToolbarButton onClick={toggleHidden} active={showHidden} title="Show Hidden Files">
        {showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </ToolbarButton>
      <ToolbarButton onClick={toggleTheme} title="Toggle Theme">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

      <ToolbarButton onClick={togglePreview} active={previewOpen} title="Toggle Preview Panel">
        <Eye className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={toggleDualPane} active={dualPane} title="Toggle Dual Pane">
        <Columns2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => openModal("duplicates")} title="Find Duplicate Files">
        <CopyIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => openModal("storage")} title="Analyze Storage">
        <HardDrive className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => openModal("recents")} title="Recent Files">
        <Clock className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => activeTab && window.fileAPI.openTerminal(activeTab.path)} title="Open Terminal Here">
        <Terminal className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => setCommandPaletteOpen(true)} title="Command Palette (⌘K)">
        <Command className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}
