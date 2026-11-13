import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import type { TrashItem } from "@/types";
import { formatBytes, formatDate } from "@/utils/format";
import { Folder, File as FileIcon, Undo2, Trash2 } from "lucide-react";

export function TrashDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    window.fileAPI
      .listTrash()
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(item: TrashItem) {
    setBusyId(item.id);
    try {
      let dest = item.originalPath;
      if (!dest) {
        const dir = await window.fileAPI.openDirectoryDialog();
        if (!dir) return;
        dest = `${dir}/${item.name}`;
      }
      await window.fileAPI.restoreTrashItem(item.id, dest);
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteForever(item: TrashItem) {
    const confirmed = await window.fileAPI.confirmDelete([item.name]);
    if (!confirmed) return;
    setBusyId(item.id);
    try {
      await window.fileAPI.deleteTrashItemForever(item.id);
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal title="Trash" onClose={closeModal} width="520px">
      <div className="space-y-2 text-sm">
        <p className="text-[11px] text-gray-400">
          {window.fileAPI.platform === "win32"
            ? "Reading the Windows Recycle Bin — original location is recovered when available."
            : window.fileAPI.platform === "darwin"
              ? "Reading ~/.Trash — pick a destination folder to restore (macOS Trash doesn't remember the original path)."
              : "Reading the XDG Trash — original location is restored automatically when known."}
        </p>

        {loading && <div className="py-8 text-center text-xs text-gray-400">Loading…</div>}
        {!loading && items.length === 0 && <div className="py-8 text-center text-xs text-gray-400">Trash is empty</div>}

        <div className="max-h-96 space-y-0.5 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5">
              {item.isDirectory ? <Folder className="h-4 w-4 shrink-0 text-accent" /> : <FileIcon className="h-4 w-4 shrink-0 text-gray-400" />}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-gray-800 dark:text-gray-100">{item.name}</div>
                <div className="truncate text-[10px] text-gray-400">
                  {formatBytes(item.size)}
                  {item.deletedAt ? ` · deleted ${formatDate(item.deletedAt)}` : ""}
                  {item.originalPath ? ` · from ${item.originalPath}` : ""}
                </div>
              </div>
              <button
                onClick={() => restore(item)}
                disabled={busyId === item.id}
                title="Restore"
                className="shrink-0 rounded p-1 hover:bg-black/10 disabled:opacity-40 dark:hover:bg-white/10"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => deleteForever(item)}
                disabled={busyId === item.id}
                title="Delete Forever"
                className="shrink-0 rounded p-1 text-red-500 hover:bg-red-500/10 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
