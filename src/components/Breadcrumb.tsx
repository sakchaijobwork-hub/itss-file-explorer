import { useEffect, useState } from "react";
import { ChevronRight, GitBranch } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { splitPathSegments } from "@/utils/format";
import type { GitStatusResult } from "@/types";

export function Breadcrumb() {
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const navigateTo = useFileStore((s) => s.navigateTo);
  const [git, setGit] = useState<GitStatusResult | null>(null);

  useEffect(() => {
    if (!activeTab) return;
    let cancelled = false;
    window.fileAPI.getGitStatus(activeTab.path).then((res) => {
      if (!cancelled) setGit(res);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab?.path]);

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
      {git?.isRepo && git.branch && (
        <div className="ml-2 flex shrink-0 items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-white/10 dark:text-gray-400">
          <GitBranch className="h-3 w-3" />
          {git.branch}
          {git.files.length > 0 && <span className="text-accent">· {git.files.length}</span>}
        </div>
      )}
    </div>
  );
}
