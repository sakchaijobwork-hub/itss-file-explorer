import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { formatBytes } from "@/utils/format";
import type { DirStatsNode } from "@/types";
import { Folder, File as FileIcon } from "lucide-react";

export function StorageAnalyzerDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const navigateTo = useFileStore((s) => s.navigateTo);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<DirStatsNode | null>(null);

  useEffect(() => {
    if (!activeTab) return;
    setLoading(true);
    window.fileAPI.getDirStats(activeTab.path).then((t) => {
      setTree(t);
      setLoading(false);
    });
  }, [activeTab?.path]);

  const maxSize = tree?.children?.[0]?.size || 1;

  return (
    <Modal title="Storage Analyzer" onClose={closeModal} width="560px">
      <div className="space-y-2 text-sm">
        <div className="text-xs text-gray-400">
          Breakdown of <span className="font-mono">{activeTab?.path}</span>
          {tree && <span className="ml-2">· total {formatBytes(tree.size)}</span>}
        </div>

        {loading && <div className="py-8 text-center text-xs text-gray-400">Calculating sizes…</div>}

        {!loading && tree && (
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {(tree.children ?? []).map((node) => (
              <button
                key={node.path}
                onClick={() => {
                  if (node.isDirectory) {
                    navigateTo(node.path);
                    closeModal();
                  } else {
                    window.fileAPI.showInFolder(node.path);
                  }
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
              >
                {node.isDirectory ? (
                  <Folder className="h-4 w-4 shrink-0 text-accent" />
                ) : (
                  <FileIcon className="h-4 w-4 shrink-0 text-gray-400" />
                )}
                <span className="w-32 shrink-0 truncate text-xs text-gray-700 dark:text-gray-200">{node.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(2, (node.size / maxSize) * 100)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-gray-500">{formatBytes(node.size)}</span>
              </button>
            ))}
            {(tree.children ?? []).length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400">Empty folder</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
