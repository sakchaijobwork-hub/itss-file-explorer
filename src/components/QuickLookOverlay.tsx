import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { FilePreviewContent } from "@/components/FilePreviewContent";

export function QuickLookOverlay() {
  const quickLookPath = useUiStore((s) => s.quickLookPath);
  const closeQuickLook = useUiStore((s) => s.closeQuickLook);
  const entries = useFileStore((s) => s.entries);

  if (!quickLookPath) return null;
  const entry = entries.find((e) => e.path === quickLookPath);
  if (!entry) return null;

  return createPortal(
    <div
      className="no-drag fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeQuickLook();
      }}
    >
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-surface-light shadow-2xl dark:bg-[#2a2a2a]">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5 dark:border-white/10">
          <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{entry.name}</span>
          <button onClick={closeQuickLook} className="rounded p-1 text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-auto p-4">
          <FilePreviewContent entry={entry} large />
        </div>
      </div>
    </div>,
    document.body
  );
}
