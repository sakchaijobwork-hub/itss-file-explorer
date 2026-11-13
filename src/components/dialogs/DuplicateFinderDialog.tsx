import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { formatBytes, basename } from "@/utils/format";
import type { DuplicateGroup } from "@/types";
import { Trash2 } from "lucide-react";

let opCounter = 0;

export function DuplicateFinderDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  async function scan() {
    if (!activeTab) return;
    setScanning(true);
    setGroups([]);
    setProgress(null);
    const opId = `dup-${++opCounter}`;
    const unsubscribe = window.fileAPI.onDuplicateProgress((p) => {
      if (p.id === opId) setProgress({ processed: p.processed, total: p.total });
    });
    try {
      const result = await window.fileAPI.findDuplicates(activeTab.path, opId);
      setGroups(result);
    } finally {
      unsubscribe();
      setScanning(false);
    }
  }

  useEffect(() => {
    scan();
  }, []);

  function toggle(path: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function deleteChecked() {
    if (checked.size === 0) return;
    const names = Array.from(checked).map((p) => basename(p));
    const confirmed = await window.fileAPI.confirmDelete(names);
    if (!confirmed) return;
    await window.fileAPI.deleteToTrash(Array.from(checked));
    setGroups((prev) =>
      prev.map((g) => ({ ...g, paths: g.paths.filter((p) => !checked.has(p)) })).filter((g) => g.paths.length > 1)
    );
    setChecked(new Set());
  }

  const totalWasted = groups.reduce((sum, g) => sum + g.size * (g.paths.length - 1), 0);

  return (
    <Modal title="Duplicate File Finder" onClose={closeModal} width="560px">
      <div className="space-y-3 text-sm">
        <div className="text-xs text-gray-400">
          Scanning <span className="font-mono">{activeTab?.path}</span>
        </div>

        {scanning && (
          <div className="text-xs text-gray-400">
            Hashing files… {progress ? `${progress.processed}/${progress.total}` : ""}
          </div>
        )}

        {!scanning && groups.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400">No duplicate files found 🎉</div>
        )}

        {!scanning && groups.length > 0 && (
          <div className="text-xs text-gray-500">
            Found {groups.length} duplicate groups · up to {formatBytes(totalWasted)} reclaimable
          </div>
        )}

        <div className="max-h-80 space-y-3 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.hash} className="rounded-md border border-black/10 p-2 dark:border-white/10">
              <div className="mb-1 text-[11px] text-gray-400">{formatBytes(group.size)} each</div>
              {group.paths.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2 py-0.5 text-xs">
                  <input type="checkbox" checked={checked.has(p)} onChange={() => toggle(p)} />
                  <span className="truncate text-gray-700 dark:text-gray-200">{p}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={scan} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Rescan
          </button>
          <button
            onClick={deleteChecked}
            disabled={checked.size === 0}
            className="flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Move {checked.size} to Trash
          </button>
        </div>
      </div>
    </Modal>
  );
}
