import { useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { basename } from "@/utils/format";

function applyPattern(pattern: string, name: string, index: number): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1) : "";
  return pattern
    .replaceAll("{name}", base)
    .replaceAll("{ext}", ext)
    .replaceAll("{n}", String(index + 1))
    .replaceAll("{n2}", String(index + 1).padStart(2, "0"))
    .replaceAll("{n3}", String(index + 1).padStart(3, "0"));
}

export function BatchRenameDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const entries = useFileStore((s) => s.entries);
  const [pattern, setPattern] = useState("{name}_{n2}.{ext}");
  const [busy, setBusy] = useState(false);

  const targets = useMemo(
    () => entries.filter((e) => selectedPaths.has(e.path) && !e.isDirectory).concat(
      entries.filter((e) => selectedPaths.has(e.path) && e.isDirectory)
    ),
    [entries, selectedPaths]
  );

  const preview = targets.map((e, i) => ({
    oldName: e.name,
    newName: applyPattern(pattern, e.name, i),
    path: e.path,
  }));

  async function apply() {
    setBusy(true);
    try {
      for (const item of preview) {
        if (item.newName && item.newName !== item.oldName) {
          await window.fileAPI.rename(item.path, item.newName);
        }
      }
      closeModal();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Batch Rename" onClose={closeModal} width="520px">
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Pattern — use <code>{"{name}"}</code>, <code>{"{ext}"}</code>, <code>{"{n}"}</code>,{" "}
            <code>{"{n2}"}</code>, <code>{"{n3}"}</code>
          </label>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
          />
        </div>

        <div className="max-h-64 overflow-y-auto rounded-md border border-black/10 dark:border-white/10">
          {preview.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-400">Select files to batch rename</div>
          )}
          {preview.map((p) => (
            <div key={p.path} className="flex items-center justify-between gap-2 border-b border-black/5 px-2 py-1.5 text-xs last:border-0 dark:border-white/5">
              <span className="truncate text-gray-500">{basename(p.oldName)}</span>
              <span className="shrink-0 text-gray-300">→</span>
              <span className="truncate font-medium text-gray-800 dark:text-gray-100">{p.newName}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={apply}
            disabled={busy || preview.length === 0}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "Renaming…" : `Rename ${preview.length} items`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
