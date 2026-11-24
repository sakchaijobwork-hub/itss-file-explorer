import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import type { RecentEntry } from "@/types";
import { basename, formatDate } from "@/utils/format";
import { getFileIconComponent } from "@/utils/fileIcon";
import { FolderOpen, Trash2, Clock } from "lucide-react";

function dirnameOf(p: string): string {
  return p.replace(/[/\\][^/\\]+[/\\]?$/, "") || "/";
}

function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : "";
}

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
    <Modal title="Recent Files" onClose={closeModal} width="520px">
      <div className="text-sm">
        {recents.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-gray-400">
            <Clock className="h-8 w-8 opacity-40" />
            <span className="text-xs">No recent files yet</span>
          </div>
        )}
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {recents.map((r) => {
            const name = basename(r.path);
            const Icon = getFileIconComponent(extensionOf(name), false);
            return (
              <div
                key={r.path}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => window.fileAPI.openPath(r.path)}
                >
                  <Icon className="h-8 w-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-gray-800 dark:text-gray-100">{name}</div>
                    <div className="truncate text-[11px] text-gray-400">{dirnameOf(r.path)}</div>
                  </div>
                </button>
                <span className="hidden shrink-0 text-[11px] text-gray-400 sm:block">{formatDate(r.openedAt)}</span>
                <button
                  title="Go to folder"
                  onClick={() => {
                    navigateTo(dirnameOf(r.path));
                    closeModal();
                  }}
                  className="shrink-0 rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/10"
                >
                  <FolderOpen className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        {recents.length > 0 && (
          <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2 dark:border-white/10">
            <span className="text-[11px] text-gray-400">
              {recents.length} {recents.length === 1 ? "item" : "items"}
            </span>
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
