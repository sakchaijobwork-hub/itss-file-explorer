import { useEffect, useState } from "react";
import { Undo2, Redo2 } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { useFileOperations } from "@/hooks/useFileOperations";
import { formatBytes } from "@/utils/format";

export function StatusBar() {
  const entries = useFileStore((s) => s.entries);
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const { canUndo, canRedo, performUndo, performRedo } = useFileOperations();
  const [version, setVersion] = useState("");

  useEffect(() => {
    window.fileAPI.getCurrentVersion().then(setVersion);
  }, []);

  const selectedCount = selectedPaths.size;
  const totalSize = entries
    .filter((e) => selectedCount === 0 || selectedPaths.has(e.path))
    .reduce((sum, e) => sum + (e.isDirectory ? 0 : e.size), 0);

  return (
    <div className="no-drag flex h-6 shrink-0 items-center justify-between border-t border-black/5 bg-panel-light px-3 text-[11px] text-gray-500 dark:border-white/5 dark:bg-panel-dark dark:text-gray-400">
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
        {version && ` · v${version}`}
      </span>
    </div>
  );
}
