import { useEffect, useState } from "react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { getFileIconComponent } from "@/utils/fileIcon";
import { formatBytes, formatDate } from "@/utils/format";
import { X } from "lucide-react";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "mkv"]);
const AUDIO_EXT = new Set(["mp3", "wav", "flac", "aac", "m4a"]);
const TEXT_EXT = new Set([
  "txt", "md", "json", "js", "ts", "tsx", "jsx", "css", "html", "py", "java", "go", "rs", "c", "cpp", "sh", "yml", "yaml", "xml", "log", "csv",
]);

export function PreviewPanel() {
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const entries = useFileStore((s) => s.entries);
  const previewOpen = useUiStore((s) => s.previewOpen);
  const togglePreview = useUiStore((s) => s.togglePreview);
  const [textContent, setTextContent] = useState<{ content: string; truncated: boolean } | null>(null);

  const selected = selectedPaths.size === 1 ? entries.find((e) => selectedPaths.has(e.path)) : null;

  useEffect(() => {
    setTextContent(null);
    if (selected && !selected.isDirectory && TEXT_EXT.has(selected.extension)) {
      window.fileAPI.readTextPreview(selected.path).then((res) => {
        if (res.encoding === "utf8") setTextContent({ content: res.content, truncated: res.truncated });
      });
    }
  }, [selected?.path]);

  if (!previewOpen) return null;

  const fileUrl = selected ? `file://${encodeURI(selected.path)}` : null;
  const Icon = selected ? getFileIconComponent(selected.extension, selected.isDirectory) : null;

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-black/5 bg-panel-light dark:border-white/5 dark:bg-panel-dark">
      <div className="flex items-center justify-between border-b border-black/5 px-3 py-2 dark:border-white/5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preview</span>
        <button onClick={togglePreview} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {!selected ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-gray-400">
          Select a file to preview
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-3">
          <div className="flex items-center justify-center rounded-lg bg-black/5 p-2 dark:bg-white/5">
            {selected.isDirectory ? (
              Icon && <Icon className="h-16 w-16 text-accent" />
            ) : IMAGE_EXT.has(selected.extension) && fileUrl ? (
              <img src={fileUrl} alt={selected.name} className="max-h-48 w-full rounded object-contain" />
            ) : VIDEO_EXT.has(selected.extension) && fileUrl ? (
              <video src={fileUrl} controls className="max-h-48 w-full rounded" />
            ) : AUDIO_EXT.has(selected.extension) && fileUrl ? (
              <audio src={fileUrl} controls className="w-full" />
            ) : selected.extension === "pdf" && fileUrl ? (
              <iframe src={fileUrl} title={selected.name} className="h-56 w-full rounded bg-white" />
            ) : (
              Icon && <Icon className="h-16 w-16 text-gray-400" />
            )}
          </div>

          {textContent && (
            <pre className="max-h-48 overflow-auto rounded-md bg-black/5 p-2 text-[11px] leading-snug text-gray-700 dark:bg-white/5 dark:text-gray-300">
              {textContent.content}
              {textContent.truncated && "\n…(truncated)"}
            </pre>
          )}

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
