import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import { basename } from "@/utils/format";

export function SplitMergeDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const targetPaths = useUiStore((s) => s.modalTargetPaths);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

  const [mode, setMode] = useState<"split" | "merge">(targetPaths.length > 1 ? "merge" : "split");
  const [chunkMb, setChunkMb] = useState(100);
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  async function runSplit() {
    if (!activeTab || targetPaths.length !== 1) return;
    setBusy(true);
    try {
      const parts = await window.fileAPI.splitFile(targetPaths[0], chunkMb * 1024 * 1024, activeTab.path);
      setResultMsg(`Created ${parts.length} part(s) in ${activeTab.path}`);
    } finally {
      setBusy(false);
    }
  }

  async function runMerge() {
    if (!activeTab || targetPaths.length < 2) return;
    setBusy(true);
    try {
      const firstBase = basename(targetPaths[0]).replace(/\.part\d+$/, "");
      const dest = await window.fileAPI.saveDialog(`${activeTab.path}/${firstBase}`);
      if (dest) {
        await window.fileAPI.mergeFiles(targetPaths, dest);
        setResultMsg(`Merged into ${dest}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Split / Merge Files" onClose={closeModal} width="420px">
      <div className="space-y-3 text-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("split")}
            className={`rounded-md px-3 py-1 text-xs ${mode === "split" ? "bg-accent text-white" : "bg-black/5 dark:bg-white/10"}`}
          >
            Split
          </button>
          <button
            onClick={() => setMode("merge")}
            className={`rounded-md px-3 py-1 text-xs ${mode === "merge" ? "bg-accent text-white" : "bg-black/5 dark:bg-white/10"}`}
          >
            Merge
          </button>
        </div>

        {mode === "split" ? (
          <>
            <div className="text-xs text-gray-400">File: {targetPaths[0] ? basename(targetPaths[0]) : "Select one file"}</div>
            <label className="flex items-center gap-2 text-xs">
              Chunk size (MB)
              <input
                type="number"
                value={chunkMb}
                onChange={(e) => setChunkMb(Number(e.target.value))}
                className="w-24 rounded-md border border-black/10 bg-transparent px-2 py-1 outline-none focus:border-accent dark:border-white/10"
              />
            </label>
          </>
        ) : (
          <div className="text-xs text-gray-400">
            {targetPaths.length} part file(s) selected — will be merged in sorted filename order.
          </div>
        )}

        {resultMsg && (
          <div className="rounded-md bg-green-500/10 p-2 text-[11px] text-green-600 dark:text-green-400">{resultMsg}</div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Close
          </button>
          <button
            onClick={mode === "split" ? runSplit : runMerge}
            disabled={busy || (mode === "split" ? targetPaths.length !== 1 : targetPaths.length < 2)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "Working…" : mode === "split" ? "Split" : "Merge"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
