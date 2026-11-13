import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { formatBytes, formatDate } from "@/utils/format";
import { FilePreviewContent } from "@/components/FilePreviewContent";
import { X, Maximize2 } from "lucide-react";

export function PreviewPanel() {
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const entries = useFileStore((s) => s.entries);
  const previewOpen = useUiStore((s) => s.previewOpen);
  const togglePreview = useUiStore((s) => s.togglePreview);
  const openQuickLook = useUiStore((s) => s.openQuickLook);

  const selected = selectedPaths.size === 1 ? entries.find((e) => selectedPaths.has(e.path)) : null;

  if (!previewOpen) return null;

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-black/5 bg-panel-light dark:border-white/5 dark:bg-panel-dark">
      <div className="flex items-center justify-between border-b border-black/5 px-3 py-2 dark:border-white/5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preview</span>
        <div className="flex items-center gap-1">
          {selected && (
            <button onClick={() => openQuickLook(selected.path)} title="Quick Look (Space)" className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={togglePreview} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!selected ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-gray-400">
          Select a file to preview
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-3">
          <FilePreviewContent entry={selected} />

          <div className="space-y-1 text-xs">
            <div className="truncate font-medium text-gray-800 dark:text-gray-100">{selected.name}</div>
            <Row label="Kind" value={selected.isDirectory ? "Folder" : selected.extension.toUpperCase() || "File"} />
            {!selected.isDirectory && <Row label="Size" value={formatBytes(selected.size)} />}
            <Row label="Modified" value={formatDate(selected.modifiedAt)} />
            <Row label="Created" value={formatDate(selected.createdAt)} />
            <Row label="Path" value={selected.path} wrap />
          </div>
        </div>
      )}
    </aside>
  );
}

function Row({ label, value, wrap }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="shrink-0 text-gray-400">{label}</span>
      <span className={`text-right text-gray-600 dark:text-gray-300 ${wrap ? "break-all" : "truncate"}`}>
        {value}
      </span>
    </div>
  );
}
