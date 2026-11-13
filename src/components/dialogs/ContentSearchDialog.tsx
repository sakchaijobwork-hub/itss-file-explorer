import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import type { ContentSearchResult } from "@/types";
import { basename } from "@/utils/format";
import { FileSearch } from "lucide-react";

let opCounter = 0;

export function ContentSearchDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const navigateTo = useFileStore((s) => s.navigateTo);
  const select = useFileStore((s) => s.select);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState<{ scanned: number; found: number } | null>(null);
  const [results, setResults] = useState<ContentSearchResult[]>([]);

  async function runSearch() {
    if (!activeTab || !query.trim()) return;
    setSearching(true);
    setResults([]);
    setProgress(null);
    const opId = `search-${++opCounter}`;
    const unsubscribe = window.fileAPI.onSearchProgress((p) => {
      if (p.id === opId) setProgress({ scanned: p.scanned, found: p.found });
    });
    try {
      const res = await window.fileAPI.searchContent(activeTab.path, query.trim(), opId);
      setResults(res);
    } finally {
      unsubscribe();
      setSearching(false);
    }
  }

  function openResult(r: ContentSearchResult) {
    const dir = r.path.replace(/[/\\][^/\\]+$/, "") || "/";
    navigateTo(dir);
    select(r.path, "single");
    closeModal();
  }

  return (
    <Modal title="Search File Contents" onClose={closeModal} width="560px">
      <div className="space-y-3 text-sm">
        <div className="flex gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Text to find inside files…"
            className="flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
          />
          <button
            onClick={runSearch}
            disabled={searching || !query.trim()}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            <FileSearch className="h-3.5 w-3.5" />
            Search
          </button>
        </div>

        <div className="text-xs text-gray-400">
          Searching recursively under <span className="font-mono">{activeTab?.path}</span>
          {progress && ` — scanned ${progress.scanned} files, ${progress.found} matches`}
        </div>

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.path}
              onClick={() => openResult(r)}
              className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
            >
              <div className="truncate text-xs font-medium text-gray-800 dark:text-gray-100">{basename(r.path)}</div>
              <div className="truncate text-[11px] text-gray-500">
                line {r.lineNumber}: …{r.snippet}…
              </div>
            </button>
          ))}
          {!searching && results.length === 0 && query && (
            <div className="py-6 text-center text-xs text-gray-400">No matches found</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
