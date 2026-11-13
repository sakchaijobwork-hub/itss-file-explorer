import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { getFileIconComponent } from "@/utils/fileIcon";
import type { FileEntry } from "@/types";

interface ColumnData {
  path: string;
  entries: FileEntry[];
  loading: boolean;
}

export function ColumnView() {
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const navigateTo = useFileStore((s) => s.navigateTo);
  const select = useFileStore((s) => s.select);
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const showHidden = useFileStore((s) => s.showHidden);

  const [chain, setChain] = useState<string[]>([]);
  const [columns, setColumns] = useState<ColumnData[]>([]);

  useEffect(() => {
    setChain([]);
  }, [activeTab?.path]);

  useEffect(() => {
    if (!activeTab) return;
    const paths = [activeTab.path, ...chain];
    let cancelled = false;

    (async () => {
      const loaded: ColumnData[] = [];
      for (const p of paths) {
        try {
          const result = await window.fileAPI.readDir(p);
          loaded.push({ path: p, entries: result.entries, loading: false });
        } catch {
          loaded.push({ path: p, entries: [], loading: false });
        }
      }
      if (!cancelled) setColumns(loaded);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab?.path, chain]);

  function clickEntry(colIndex: number, entry: FileEntry) {
    select(entry.path, "single");
    if (entry.isDirectory) {
      setChain(chain.slice(0, colIndex).concat(entry.path));
    } else {
      setChain(chain.slice(0, colIndex));
    }
  }

  function doubleClickEntry(entry: FileEntry) {
    if (entry.isDirectory) navigateTo(entry.path);
    else window.fileAPI.openPath(entry.path);
  }

  return (
    <div className="flex flex-1 overflow-x-auto">
      {columns.map((col, i) => (
        <div key={col.path} className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-black/5 dark:border-white/5">
          {col.entries
            .filter((e) => showHidden || !e.hidden)
            .map((entry) => {
              const Icon = getFileIconComponent(entry.extension, entry.isDirectory);
              const isSelected = selectedPaths.has(entry.path) || chain[i] === entry.path;
              return (
                <button
                  key={entry.path}
                  onClick={() => clickEntry(i, entry)}
                  onDoubleClick={() => doubleClickEntry(entry)}
                  className={`flex items-center gap-2 px-2 py-1 text-left text-xs ${
                    isSelected ? "bg-accent/20 text-accent" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${entry.isDirectory ? "text-accent" : "text-gray-400"}`} />
                  <span className="flex-1 truncate">{entry.name}</span>
                  {entry.isDirectory && <ChevronRight className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />}
                </button>
              );
            })}
          {col.entries.length === 0 && <div className="p-3 text-center text-[11px] text-gray-400">Empty</div>}
        </div>
      ))}
    </div>
  );
}
