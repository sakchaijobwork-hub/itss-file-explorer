import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import type { RecentEntry } from "@/types";
import { basename } from "@/utils/format";
import { Clock, FolderOpen, Trash2 } from "lucide-react";

export function RecentsDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const navigateTo = useFileStore((s) => s.navigateTo);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  useEffect(() => {
    window.fileAPI.listRecents().then(setRecents);
  }, []);

  async function clear() {
    const next = await window.fileAPI.clearRecents();
    setRecents(next);
  }

  return (
    <Modal title="Recent Files" onClose={closeModal} width="480px">
      <div className="space-y-2 text-sm">
        {recents.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400">No recent files yet</div>
        )}
        <div className="max-h-96 space-y-0.5 overflow-y-auto">
          {recents.map((r) => (
            <div
              key={r.path}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => window.fileAPI.openPath(r.path)}
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="truncate text-xs text-gray-700 dark:text-gray-200">{basename(r.path)}</span>
              </button>
              <button
                title="Go to folder"
                onClick={() => {
                  navigateTo(r.path.replace(/[/\\][^/\\]+$/, "") || "/");
                  closeModal();
                }}
                className="shrink-0 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
        {recents.length > 0 && (
          <div className="flex justify-end pt-1">
            <button
              onClick={clear}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Recents
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
