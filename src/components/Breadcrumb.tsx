import { ChevronRight } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { splitPathSegments } from "@/utils/format";

export function Breadcrumb() {
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const navigateTo = useFileStore((s) => s.navigateTo);

  if (!activeTab) return null;
  const segments = splitPathSegments(activeTab.path);

  return (
    <div className="no-drag flex h-8 items-center gap-0.5 overflow-x-auto border-b border-black/5 bg-surface-light px-3 text-xs text-gray-600 dark:border-white/5 dark:bg-surface-dark dark:text-gray-300">
      {segments.map((seg, i) => (
        <div key={seg.path} className="flex shrink-0 items-center gap-0.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
          <button
            onClick={() => navigateTo(seg.path)}
            className="rounded px-1.5 py-0.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {seg.label}
          </button>
        </div>
      ))}
    </div>
  );
}
