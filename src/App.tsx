import { useEffect, useState } from "react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { useDirectoryLoader } from "@/hooks/useDirectoryLoader";
import { useFileOperations } from "@/hooks/useFileOperations";
import { TabsBar } from "@/components/TabsBar";
import { UpdateBanner } from "@/components/UpdateBanner";
import { Toolbar } from "@/components/Toolbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Sidebar } from "@/components/Sidebar";
import { FileList } from "@/components/FileList";
import { ColumnView } from "@/components/ColumnView";
import { StatusBar } from "@/components/StatusBar";
import { ProgressToast } from "@/components/ProgressToast";
import { PreviewPanel } from "@/components/PreviewPanel";
import { SecondaryPane } from "@/components/SecondaryPane";
import { CommandPalette } from "@/components/CommandPalette";
import { ModalRoot } from "@/components/ModalRoot";
import { QuickLookOverlay } from "@/components/QuickLookOverlay";
import { loadSettings } from "@/utils/settings";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const theme = useFileStore((s) => s.theme);
  const initTabs = useFileStore((s) => s.initTabs);
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const selectAll = useFileStore((s) => s.selectAll);
  const startRename = useFileStore((s) => s.startRename);
  const renamingPath = useFileStore((s) => s.renamingPath);
  const dualPane = useUiStore((s) => s.dualPane);
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const loadTags = useUiStore((s) => s.loadTags);
  const viewMode = useFileStore((s) => s.viewMode);
  const quickLookPath = useUiStore((s) => s.quickLookPath);
  const openQuickLook = useUiStore((s) => s.openQuickLook);
  const closeQuickLook = useUiStore((s) => s.closeQuickLook);
  const setAddressBarEditing = useUiStore((s) => s.setAddressBarEditing);
  const openModal = useUiStore((s) => s.openModal);

  const { copySelection, cutSelection, paste, deleteSelection, createNewFolder, createNewFile, performUndo, performRedo } =
    useFileOperations();
  const setViewMode = useFileStore((s) => s.setViewMode);
  const setSort = useFileStore((s) => s.setSort);
  const toggleHidden = useFileStore((s) => s.toggleHidden);
  const toggleTheme = useFileStore((s) => s.toggleTheme);
  const goBack = useFileStore((s) => s.goBack);
  const goForward = useFileStore((s) => s.goForward);
  const goUp = useFileStore((s) => s.goUp);
  const openTab = useFileStore((s) => s.openTab);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const togglePreview = useUiStore((s) => s.togglePreview);
  const toggleDualPane = useUiStore((s) => s.toggleDualPane);
  const gridIconSize = useUiStore((s) => s.gridIconSize);
  const setGridIconSize = useUiStore((s) => s.setGridIconSize);
  const tabs = useFileStore((s) => s.tabs);
  const activeTabId = useFileStore((s) => s.activeTabId);

  useDirectoryLoader();

  useEffect(() => {
    if (tabs.length === 0) return;
    const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTabId));
    try {
      localStorage.setItem(
        "itss-session-tabs",
        JSON.stringify({ paths: tabs.map((t) => t.path), activeIndex })
      );
    } catch {
      // storage unavailable — session simply won't be restored
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    window.fileAPI.getHome().then(initTabs);
    loadTags();
    const settings = loadSettings();
    setViewMode(settings.defaultViewMode);
    setSort(settings.defaultSortKey, settings.defaultSortDirection);
    if (settings.showHiddenByDefault) toggleHidden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initTabs, loadTags]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (renamingPath) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (mod && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setAddressBarEditing(true);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        openModal("contentSearch");
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        performRedo();
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        performUndo();
      } else if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelection();
      } else if (mod && e.key.toLowerCase() === "x") {
        e.preventDefault();
        cutSelection();
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        paste();
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAll();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createNewFolder();
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        window.fileAPI.newWindow();
      } else if (e.key === "Delete" || (e.key === "Backspace" && e.metaKey)) {
        e.preventDefault();
        deleteSelection(false);
      } else if (e.key === "Enter" && selectedPaths.size === 1) {
        e.preventDefault();
        startRename(Array.from(selectedPaths)[0]);
      } else if (e.key === " " && !mod) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        if (quickLookPath) {
          closeQuickLook();
        } else if (selectedPaths.size === 1) {
          openQuickLook(Array.from(selectedPaths)[0]);
        }
      } else if (e.key === "Escape" && quickLookPath) {
        closeQuickLook();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copySelection,
    cutSelection,
    paste,
    performUndo,
    performRedo,
    selectAll,
    createNewFolder,
    deleteSelection,
    selectedPaths,
    startRename,
    renamingPath,
    commandPaletteOpen,
    setCommandPaletteOpen,
    quickLookPath,
    openQuickLook,
    closeQuickLook,
    setAddressBarEditing,
    openModal,
  ]);

  useEffect(() => {
    const unsubscribe = window.fileAPI.onMenuAction((action) => {
      switch (action) {
        case "undo":
          performUndo();
          break;
        case "redo":
          performRedo();
          break;
        case "new-tab":
          if (activeTab) openTab(activeTab.path);
          break;
        case "new-folder":
          createNewFolder();
          break;
        case "new-file":
          createNewFile();
          break;
        case "open-terminal":
          if (activeTab) window.fileAPI.openTerminal(activeTab.path);
          break;
        case "connect-remote":
          openModal("remote");
          break;
        case "compare-folders":
          openModal("compare");
          break;
        case "content-search":
          openModal("contentSearch");
          break;
        case "view-grid":
          setViewMode("grid");
          break;
        case "view-list":
          setViewMode("list");
          break;
        case "view-details":
          setViewMode("details");
          break;
        case "view-columns":
          setViewMode("columns");
          break;
        case "zoom-in":
          setGridIconSize(Math.min(160, gridIconSize + 8));
          break;
        case "zoom-out":
          setGridIconSize(Math.max(72, gridIconSize - 8));
          break;
        case "toggle-hidden":
          toggleHidden();
          break;
        case "toggle-preview":
          togglePreview();
          break;
        case "toggle-dualpane":
          toggleDualPane();
          break;
        case "toggle-theme":
          toggleTheme();
          break;
        case "go-back":
          goBack();
          break;
        case "go-forward":
          goForward();
          break;
        case "go-up":
          goUp();
          break;
        case "go-to-folder":
          setAddressBarEditing(true);
          break;
        case "find-duplicates":
          openModal("duplicates");
          break;
        case "analyze-storage":
          openModal("storage");
          break;
        case "batch-rename":
          openModal("batchRename");
          break;
        case "recent-files":
          openModal("recents");
          break;
        case "automation":
          openModal("automation");
          break;
        case "plugins":
          openModal("plugins");
          break;
        case "settings":
          openModal("settings");
          break;
        case "shortcuts-help":
          openModal("shortcuts");
          break;
        case "about":
          openModal("about");
          break;
        case "check-updates":
          window.fileAPI.checkForUpdates();
          break;
      }
    });
    return unsubscribe;
  }, [
    activeTab,
    openTab,
    createNewFolder,
    createNewFile,
    performUndo,
    performRedo,
    openModal,
    setViewMode,
    setGridIconSize,
    gridIconSize,
    toggleHidden,
    togglePreview,
    toggleDualPane,
    toggleTheme,
    goBack,
    goForward,
    goUp,
    setAddressBarEditing,
  ]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-light text-gray-900 dark:bg-surface-dark dark:text-gray-100">
      <TabsBar />
      <UpdateBanner />
      <Toolbar onSearch={setSearchQuery} />
      <Breadcrumb />
      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar />
        {viewMode === "columns" ? <ColumnView /> : <FileList searchQuery={searchQuery} />}
        {dualPane && <SecondaryPane />}
        <PreviewPanel />
        <ProgressToast />
      </div>
      <StatusBar />
      <CommandPalette />
      <ModalRoot />
      <QuickLookOverlay />
    </div>
  );
}
