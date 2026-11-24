import { ChevronRight, Undo2, Redo2 } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { useFileOperations } from "@/hooks/useFileOperations";
import { formatBytes, splitPathSegments } from "@/utils/format";

function PathBar() {
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const navigateTo = useFileStore((s) => s.navigateTo);

  if (!activeTab) return null;
  const segments = splitPathSegments(activeTab.path);

  async function copyPath(path: string) {
    const action = await window.fileAPI.showContextMenu([{ id: "copyPath", label: "Copy Path" }]);
    if (action === "copyPath") await navigator.clipboard.writeText(path);
  }

  return (
    <div
      className="flex h-6 items-center gap-0.5 overflow-x-auto border-t border-black/5 px-3 text-[11px] text-gray-500 dark:border-white/5 dark:text-gray-400"
      onContextMenu={(e) => {
        e.preventDefault();
        copyPath(activeTab.path);
      }}
    >
      {segments.map((seg, i) => (
        <div key={seg.path} className="flex shrink-0 items-center gap-0.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
          <button
            onClick={() => navigateTo(seg.path)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              copyPath(seg.path);
            }}
            className="rounded px-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/10"
            title={seg.path}
          >
            {seg.label}
          </button>
        </div>
      ))}
    </div>
  );
}

export function StatusBar() {
  const entries = useFileStore((s) => s.entries);
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const { canUndo, canRedo, performUndo, performRedo } = useFileOperations();

  const selectedCount = selectedPaths.size;
  const totalSize = entries
    .filter((e) => selectedCount === 0 || selectedPaths.has(e.path))
    .reduce((sum, e) => sum + (e.isDirectory ? 0 : e.size), 0);

  return (
    <div className="no-drag shrink-0 bg-panel-light dark:bg-panel-dark">
      <PathBar />
      <div className="flex h-6 items-center justify-between border-t border-black/5 px-3 text-[11px] text-gray-500 dark:border-white/5 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span>{entries.length} items</span>
          {canUndo && (
            <button onClick={performUndo} className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-black/5 dark:hover:bg-white/10">
              <Undo2 className="h-3 w-3" /> Undo (⌘Z)
            </button>
          )}
          {canRedo && (
            <button onClick={performRedo} className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-black/5 dark:hover:bg-white/10">
              <Redo2 className="h-3 w-3" /> Redo
            </button>
          )}
        </div>
        <span>
          {selectedCount > 0 ? `${selectedCount} selected · ` : ""}
          {formatBytes(totalSize)}
        </span>
      </div>
    </div>
  );
}
