import { useEffect, useState } from "react";
import { ChevronLeft, ChevronUp, ArrowLeftRight, ArrowRight } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { getFileIconComponent } from "@/utils/fileIcon";
import { splitPathSegments } from "@/utils/format";
import type { FileEntry } from "@/types";

let opCounter = 0;

export function SecondaryPane() {
  const [path, setPath] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const mainTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const mainSelectedPaths = useFileStore((s) => s.selectedPaths);

  useEffect(() => {
    window.fileAPI.getHome().then((home) => setPath(home));
  }, []);

  useEffect(() => {
    if (!path) return;
    window.fileAPI.readDir(path).then((r) => setEntries(r.entries));
  }, [path]);

  function navigate(next: string) {
    setHistory((h) => [...h, path]);
    setPath(next);
    setSelected(null);
  }

  function goUp() {
    const parent = path.replace(/[/\\][^/\\]+[/\\]?$/, "") || "/";
    navigate(parent);
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setPath(prev);
      return h.slice(0, -1);
    });
  }

  async function copyMainSelectionHere() {
    if (mainSelectedPaths.size === 0) return;
    const opId = `sec-copy-${++opCounter}`;
    await window.fileAPI.copy(Array.from(mainSelectedPaths), path, opId);
    window.fileAPI.readDir(path).then((r) => setEntries(r.entries));
  }

  async function moveMainSelectionHere() {
    if (mainSelectedPaths.size === 0) return;
    const opId = `sec-move-${++opCounter}`;
    await window.fileAPI.move(Array.from(mainSelectedPaths), path, opId);
    window.fileAPI.readDir(path).then((r) => setEntries(r.entries));
  }

  async function copySelectedToMain() {
    if (!selected || !mainTab) return;
    const opId = `sec-copy2-${++opCounter}`;
    await window.fileAPI.copy([selected], mainTab.path, opId);
  }

  const segments = path ? splitPathSegments(path) : [];

  return (
    <div className="flex w-1/2 shrink-0 flex-col border-l border-black/5 dark:border-white/5">
      <div className="no-drag flex h-9 items-center gap-1 border-b border-black/5 px-2 dark:border-white/5">
        <button onClick={goBack} className="flex h-6 w-6 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button onClick={goUp} className="flex h-6 w-6 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 truncate text-xs text-gray-500">
          {segments.map((s) => s.label).join(" / ")}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-black/5 px-2 py-1 dark:border-white/5">
        <button
          onClick={copyMainSelectionHere}
          disabled={mainSelectedPaths.size === 0}
          title="Copy selection from left pane into this folder"
          className="flex items-center gap-1 rounded bg-black/5 px-2 py-1 text-[11px] hover:bg-black/10 disabled:opacity-30 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <ArrowRight className="h-3 w-3" /> Copy here
        </button>
        <button
          onClick={moveMainSelectionHere}
          disabled={mainSelectedPaths.size === 0}
          title="Move selection from left pane into this folder"
          className="flex items-center gap-1 rounded bg-black/5 px-2 py-1 text-[11px] hover:bg-black/10 disabled:opacity-30 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <ArrowLeftRight className="h-3 w-3" /> Move here
        </button>
        <button
          onClick={copySelectedToMain}
          disabled={!selected}
          title="Copy selected item into left pane's folder"
          className="ml-auto flex items-center gap-1 rounded bg-black/5 px-2 py-1 text-[11px] hover:bg-black/10 disabled:opacity-30 dark:bg-white/5 dark:hover:bg-white/10"
        >
          Copy to left
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {entries.map((entry) => {
          const Icon = getFileIconComponent(entry.extension, entry.isDirectory);
          return (
            <div
              key={entry.path}
              onClick={() => setSelected(entry.path)}
              onDoubleClick={() => (entry.isDirectory ? navigate(entry.path) : window.fileAPI.openPath(entry.path))}
              className={`flex cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs ${
                selected === entry.path ? "bg-accent/20" : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${entry.isDirectory ? "" : "text-gray-400"}`} />
              <span className="truncate text-gray-700 dark:text-gray-200">{entry.name}</span>
            </div>
          );
        })}
        {entries.length === 0 && <div className="p-4 text-center text-xs text-gray-400">Empty folder</div>}
      </div>
    </div>
  );
}
