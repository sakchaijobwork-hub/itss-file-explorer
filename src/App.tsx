import { useEffect, useState } from "react";
import { useFileStore } from "@/store/useFileStore";
import { useDirectoryLoader } from "@/hooks/useDirectoryLoader";
import { useFileOperations } from "@/hooks/useFileOperations";
import { TabsBar } from "@/components/TabsBar";
import { Toolbar } from "@/components/Toolbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Sidebar } from "@/components/Sidebar";
import { FileList } from "@/components/FileList";
import { StatusBar } from "@/components/StatusBar";
import { ProgressToast } from "@/components/ProgressToast";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const theme = useFileStore((s) => s.theme);
  const initTabs = useFileStore((s) => s.initTabs);
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const selectAll = useFileStore((s) => s.selectAll);
  const startRename = useFileStore((s) => s.startRename);
  const renamingPath = useFileStore((s) => s.renamingPath);

  const { copySelection, cutSelection, paste, deleteSelection, createNewFolder } = useFileOperations();

  useDirectoryLoader();

  useEffect(() => {
    window.fileAPI.getHome().then(initTabs);
  }, [initTabs]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (renamingPath) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "c") {
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
      } else if (e.key === "Delete" || (e.key === "Backspace" && e.metaKey)) {
        e.preventDefault();
        deleteSelection(false);
      } else if (e.key === "Enter" && selectedPaths.size === 1) {
        e.preventDefault();
        startRename(Array.from(selectedPaths)[0]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySelection, cutSelection, paste, selectAll, createNewFolder, deleteSelection, selectedPaths, startRename, renamingPath]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-light text-gray-900 dark:bg-surface-dark dark:text-gray-100">
      <TabsBar />
      <Toolbar onSearch={setSearchQuery} />
      <Breadcrumb />
      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar />
        <FileList searchQuery={searchQuery} />
        <ProgressToast />
      </div>
      <StatusBar />
    </div>
  );
}
