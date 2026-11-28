import { useState } from "react";
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
  LayoutGrid,
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

type RibbonTab = "home" | "view" | "tools";

function QuickButton({
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
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
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

function RibbonButton({
  onClick,
  disabled,
  active,
  icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={clsx(
        "flex h-14 w-[58px] shrink-0 flex-col items-center justify-start gap-1 rounded-lg pt-1 text-center text-[10.5px] leading-tight transition-colors",
        disabled
          ? "cursor-default opacity-30"
          : "hover:bg-black/5 dark:hover:bg-white/10",
        active && "bg-accent/15 text-accent"
      )}
    >
      {icon}
      <span className="px-0.5">{label}</span>
    </button>
  );
}

function RibbonRowButton({
  onClick,
  active,
  icon,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 text-[11.5px] transition-colors",
        active ? "bg-accent/15 text-accent" : "hover:bg-black/5 dark:hover:bg-white/10"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-between px-2.5 pb-1 pt-0.5">
      <div className="flex items-center gap-1">{children}</div>
      <span className="mt-1 whitespace-nowrap text-[10.5px] text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

function RibbonDivider() {
  return <div className="mx-0.5 w-px shrink-0 self-stretch bg-black/10 dark:bg-white/10" />;
}

function RibbonTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative px-3.5 text-[12.5px] font-semibold tracking-wide transition-colors",
        active ? "text-accent" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
      )}
    >
      {children}
      {active && <span className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-t-full bg-accent" />}
    </button>
  );
}

export function Toolbar({ onSearch }: { onSearch: (q: string) => void }) {
  const [activeTab, setActiveTab] = useState<RibbonTab>("home");

  const goBack = useFileStore((s) => s.goBack);
  const goForward = useFileStore((s) => s.goForward);
  const goUp = useFileStore((s) => s.goUp);
  const canGoBack = useFileStore((s) => s.canGoBack());
  const canGoForward = useFileStore((s) => s.canGoForward());
  const viewMode = useFileStore((s) => s.viewMode);
  const setViewMode = useFileStore((s) => s.setViewMode);
  const showHidden = useFileStore((s) => s.showHidden);
  const toggleHidden = useFileStore((s) => s.toggleHidden);
  const groupByKind = useFileStore((s) => s.groupByKind);
  const toggleGroupByKind = useFileStore((s) => s.toggleGroupByKind);
  const theme = useFileStore((s) => s.theme);
  const toggleTheme = useFileStore((s) => s.toggleTheme);
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const clipboard = useFileStore((s) => s.clipboard);
  const activeFileTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

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
    if (activeFileTab) window.fileAPI.readDir(activeFileTab.path);
  };

  const iconSm = "h-4 w-4";
  const iconLg = "h-5 w-5";

  return (
    <div className="no-drag border-b border-black/5 bg-panel-light dark:border-white/5 dark:bg-panel-dark">
      {/* Quick access row — navigation, search, and the controls used constantly */}
      <div className="flex h-8 items-center gap-1 border-b border-black/5 px-2 dark:border-white/5">
        <QuickButton onClick={goBack} disabled={!canGoBack} title="Back">
          <ChevronLeft className={iconSm} />
        </QuickButton>
        <QuickButton onClick={goForward} disabled={!canGoForward} title="Forward">
          <ChevronRight className={iconSm} />
        </QuickButton>
        <QuickButton onClick={goUp} title="Up">
          <ChevronUp className={iconSm} />
        </QuickButton>
        <QuickButton onClick={refresh} title="Refresh">
          <RotateCw className="h-3.5 w-3.5" />
        </QuickButton>

        <div className="flex-1" />

        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search in this folder"
            className="h-6 w-full rounded-md bg-black/5 pl-7 pr-2 text-xs outline-none placeholder:text-gray-400 focus:bg-black/10 dark:bg-white/5 dark:focus:bg-white/10"
          />
        </div>
        <QuickButton onClick={() => openModal("contentSearch")} title="Search File Contents (⌘⇧F)">
          <FileSearch className={iconSm} />
        </QuickButton>

        <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

        <QuickButton onClick={toggleTheme} title="Toggle Theme">
          {theme === "dark" ? <Sun className={iconSm} /> : <Moon className={iconSm} />}
        </QuickButton>
        <QuickButton onClick={() => setCommandPaletteOpen(true)} title="Command Palette (⌘K)">
          <Command className={iconSm} />
        </QuickButton>
      </div>

      {/* Ribbon tabs */}
      <div className="flex h-[30px] items-stretch gap-0.5 px-2">
        <RibbonTabButton active={activeTab === "home"} onClick={() => setActiveTab("home")}>
          Home
        </RibbonTabButton>
        <RibbonTabButton active={activeTab === "view"} onClick={() => setActiveTab("view")}>
          View
        </RibbonTabButton>
        <RibbonTabButton active={activeTab === "tools"} onClick={() => setActiveTab("tools")}>
          Tools
        </RibbonTabButton>
      </div>

      {/* Ribbon body */}
      <div className="flex min-h-[72px] items-stretch gap-0.5 overflow-x-auto bg-surface-light px-2.5 py-1.5 dark:bg-surface-dark">
        {activeTab === "home" && (
          <>
            <RibbonGroup label="New">
              <RibbonButton onClick={createNewFolder} icon={<FolderPlus className={iconLg} />} label="New Folder" />
              <RibbonButton onClick={createNewFile} icon={<FilePlus className={iconLg} />} label="New File" />
            </RibbonGroup>
            <RibbonDivider />
            <RibbonGroup label="Clipboard">
              <RibbonButton
                onClick={copySelection}
                disabled={!hasSelection}
                icon={<Copy className={iconLg} />}
                label="Copy"
              />
              <RibbonButton
                onClick={cutSelection}
                disabled={!hasSelection}
                icon={<Scissors className={iconLg} />}
                label="Cut"
              />
              <RibbonButton
                onClick={paste}
                disabled={clipboard.paths.length === 0}
                icon={<Clipboard className={iconLg} />}
                label="Paste"
              />
            </RibbonGroup>
            <RibbonDivider />
            <RibbonGroup label="Organize">
              <RibbonButton
                onClick={() => deleteSelection(false)}
                disabled={!hasSelection}
                icon={<Trash2 className={iconLg} />}
                label="Trash"
              />
            </RibbonGroup>
          </>
        )}

        {activeTab === "view" && (
          <>
            <RibbonGroup label="Layout">
              <RibbonButton
                onClick={() => setViewMode("grid")}
                active={viewMode === "grid"}
                icon={<Grid2x2 className={iconLg} />}
                label="Grid"
              />
              <RibbonButton
                onClick={() => setViewMode("list")}
                active={viewMode === "list"}
                icon={<List className={iconLg} />}
                label="List"
              />
              <RibbonButton
                onClick={() => setViewMode("details")}
                active={viewMode === "details"}
                icon={<Rows3 className={iconLg} />}
                label="Details"
              />
              <RibbonButton
                onClick={() => setViewMode("columns")}
                active={viewMode === "columns"}
                icon={<Columns3 className={iconLg} />}
                label="Columns"
              />
            </RibbonGroup>
            <RibbonDivider />
            <RibbonGroup label="Arrange">
              <div className="flex flex-col justify-center gap-0.5">
                <RibbonRowButton
                  onClick={toggleHidden}
                  active={showHidden}
                  icon={showHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  label="Hidden files"
                />
                <RibbonRowButton
                  onClick={toggleGroupByKind}
                  active={groupByKind}
                  icon={<LayoutGrid className="h-3.5 w-3.5" />}
                  label="Group by kind"
                />
                {viewMode === "grid" && (
                  <div className="flex h-6 items-center gap-1.5 px-1.5" title="Icon size">
                    <Grid2x2 className="h-3 w-3 text-gray-400" />
                    <input
                      type="range"
                      min={72}
                      max={160}
                      step={8}
                      value={gridIconSize}
                      onChange={(e) => setGridIconSize(Number(e.target.value))}
                      className="h-1.5 w-16 accent-accent"
                    />
                  </div>
                )}
              </div>
            </RibbonGroup>
            <RibbonDivider />
            <RibbonGroup label="Panes">
              <RibbonButton
                onClick={togglePreview}
                active={previewOpen}
                icon={<Eye className={iconLg} />}
                label="Preview"
              />
              <RibbonButton
                onClick={toggleDualPane}
                active={dualPane}
                icon={<Columns2 className={iconLg} />}
                label="Dual Pane"
              />
            </RibbonGroup>
          </>
        )}

        {activeTab === "tools" && (
          <>
            <RibbonGroup label="Analyze">
              <RibbonButton
                onClick={() => openModal("duplicates")}
                icon={<CopyIcon className={iconLg} />}
                label="Duplicates"
              />
              <RibbonButton
                onClick={() => openModal("storage")}
                icon={<HardDrive className={iconLg} />}
                label="Storage"
              />
            </RibbonGroup>
            <RibbonDivider />
            <RibbonGroup label="Quick Access">
              <RibbonButton onClick={() => openModal("recents")} icon={<Clock className={iconLg} />} label="Recents" />
              <RibbonButton
                onClick={() => activeFileTab && window.fileAPI.openTerminal(activeFileTab.path)}
                icon={<Terminal className={iconLg} />}
                label="Terminal"
              />
            </RibbonGroup>
          </>
        )}
      </div>
    </div>
  );
}
