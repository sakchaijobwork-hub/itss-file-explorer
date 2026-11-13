import { useFileStore } from "@/store/useFileStore";
import { formatBytes } from "@/utils/format";

export function StatusBar() {
  const entries = useFileStore((s) => s.entries);
  const selectedPaths = useFileStore((s) => s.selectedPaths);

  const selectedCount = selectedPaths.size;
  const totalSize = entries
    .filter((e) => selectedCount === 0 || selectedPaths.has(e.path))
    .reduce((sum, e) => sum + (e.isDirectory ? 0 : e.size), 0);

  return (
    <div className="no-drag flex h-6 shrink-0 items-center justify-between border-t border-black/5 bg-panel-light px-3 text-[11px] text-gray-500 dark:border-white/5 dark:bg-panel-dark dark:text-gray-400">
      <span>{entries.length} items</span>
      <span>
        {selectedCount > 0 ? `${selectedCount} selected · ` : ""}
        {formatBytes(totalSize)}
      </span>
    </div>
  );
}
