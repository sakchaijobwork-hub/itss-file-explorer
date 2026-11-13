import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import type { CompareResult } from "@/types";

let opCounter = 0;

export function CompareDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

  const [left, setLeft] = useState(activeTab?.path ?? "");
  const [right, setRight] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickRight() {
    const dir = await window.fileAPI.openDirectoryDialog(left);
    if (dir) setRight(dir);
  }

  async function run() {
    if (!left || !right) return;
    setBusy(true);
    try {
      setResult(await window.fileAPI.compareDirs(left, right));
    } finally {
      setBusy(false);
    }
  }

  async function syncFile(relPath: string, direction: "toRight" | "toLeft") {
    const opId = `cmp-${++opCounter}`;
    if (direction === "toRight") {
      await window.fileAPI.copy([`${left}/${relPath}`], `${right}/${relPath}`.split("/").slice(0, -1).join("/"), opId);
    } else {
      await window.fileAPI.copy([`${right}/${relPath}`], `${left}/${relPath}`.split("/").slice(0, -1).join("/"), opId);
    }
    await run();
  }

  return (
    <Modal title="Compare / Sync Folders" onClose={closeModal} width="560px">
      <div className="space-y-3 text-sm">
        <div className="space-y-2">
          <input
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            placeholder="Left folder"
            className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10"
          />
          <div className="flex gap-2">
            <input
              value={right}
              onChange={(e) => setRight(e.target.value)}
              placeholder="Right folder"
              className="flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10"
            />
            <button onClick={pickRight} className="rounded-md bg-black/5 px-3 py-1.5 text-xs hover:bg-black/10 dark:bg-white/10">
              Browse…
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={run}
            disabled={busy || !left || !right}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "Comparing…" : "Compare"}
          </button>
        </div>

        {result && (
          <div className="max-h-80 space-y-3 overflow-y-auto text-xs">
            <Section title={`Only in left (${result.onlyLeft.length})`} items={result.onlyLeft} action="toRight" onSync={syncFile} actionLabel="Copy →" />
            <Section title={`Only in right (${result.onlyRight.length})`} items={result.onlyRight} action="toLeft" onSync={syncFile} actionLabel="← Copy" />
            <Section title={`Different size (${result.different.length})`} items={result.different} action="toRight" onSync={syncFile} actionLabel="Overwrite →" />
            <div className="text-gray-400">{result.same.length} identical file(s)</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Section({
  title,
  items,
  action,
  actionLabel,
  onSync,
}: {
  title: string;
  items: string[];
  action: "toRight" | "toLeft";
  actionLabel: string;
  onSync: (relPath: string, direction: "toRight" | "toLeft") => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 font-semibold text-gray-500">{title}</div>
      <div className="space-y-0.5">
        {items.slice(0, 100).map((item) => (
          <div key={item} className="flex items-center justify-between gap-2 rounded bg-black/5 px-2 py-1 dark:bg-white/5">
            <span className="truncate">{item}</span>
            <button onClick={() => onSync(item, action)} className="shrink-0 rounded bg-accent/20 px-2 py-0.5 text-accent hover:bg-accent/30">
              {actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
