import { useEffect, useState } from "react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { useDirectoryLoader } from "@/hooks/useDirectoryLoader";
import { useFileOperations } from "@/hooks/useFileOperations";
import { TabsBar } from "@/components/TabsBar";
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

  const { copySelection, cutSelection, paste, deleteSelection, createNewFolder } = useFileOperations();

  useDirectoryLoader();

  useEffect(() => {
    window.fileAPI.getHome().then(initTabs);
    loadTags();
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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-light text-gray-900 dark:bg-surface-dark dark:text-gray-100">
      <TabsBar />
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
