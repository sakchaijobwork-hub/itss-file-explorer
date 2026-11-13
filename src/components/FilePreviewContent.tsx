import { useEffect, useState } from "react";
import { getFileIconComponent } from "@/utils/fileIcon";
import type { DocxPreview, FileEntry, PptxPreview, XlsxPreview } from "@/types";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "mkv"]);
const AUDIO_EXT = new Set(["mp3", "wav", "flac", "aac", "m4a"]);
const TEXT_EXT = new Set([
  "txt", "md", "json", "js", "ts", "tsx", "jsx", "css", "html", "py", "java", "go", "rs", "c", "cpp", "sh", "yml", "yaml", "xml", "log", "csv",
]);
const DOCX_PREVIEWABLE = new Set(["docx"]);
const XLSX_PREVIEWABLE = new Set(["xls", "xlsx", "xlsm"]);
const PPTX_PREVIEWABLE = new Set(["pptx", "ppsx"]);

export function FilePreviewContent({ entry, large = false }: { entry: FileEntry; large?: boolean }) {
  const [textContent, setTextContent] = useState<{ content: string; truncated: boolean } | null>(null);
  const [docx, setDocx] = useState<DocxPreview | null>(null);
  const [xlsx, setXlsx] = useState<XlsxPreview | null>(null);
  const [pptx, setPptx] = useState<PptxPreview | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTextContent(null);
    setDocx(null);
    setXlsx(null);
    setPptx(null);
    setActiveSheet(0);
    if (entry.isDirectory) return;

    if (TEXT_EXT.has(entry.extension)) {
      window.fileAPI.readTextPreview(entry.path).then((res) => {
        if (res.encoding === "utf8") setTextContent({ content: res.content, truncated: res.truncated });
      });
    } else if (DOCX_PREVIEWABLE.has(entry.extension)) {
      setLoading(true);
      window.fileAPI.previewDocx(entry.path).then(setDocx).catch(() => setDocx(null)).finally(() => setLoading(false));
    } else if (XLSX_PREVIEWABLE.has(entry.extension)) {
      setLoading(true);
      window.fileAPI.previewXlsx(entry.path).then(setXlsx).catch(() => setXlsx(null)).finally(() => setLoading(false));
    } else if (PPTX_PREVIEWABLE.has(entry.extension)) {
      setLoading(true);
      window.fileAPI.previewPptx(entry.path).then(setPptx).catch(() => setPptx(null)).finally(() => setLoading(false));
    }
  }, [entry.path]);

  const fileUrl = `file://${encodeURI(entry.path)}`;
  const Icon = getFileIconComponent(entry.extension, entry.isDirectory);
  const maxH = large ? "max-h-[70vh]" : "max-h-48";

  if (entry.isDirectory) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-black/5 p-6 dark:bg-white/5">
        <Icon className={large ? "h-24 w-24 text-accent" : "h-16 w-16 text-accent"} />
      </div>
    );
  }

  if (IMAGE_EXT.has(entry.extension)) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-black/5 p-2 dark:bg-white/5">
        <img src={fileUrl} alt={entry.name} className={`${maxH} w-full rounded object-contain`} />
      </div>
    );
  }
  if (VIDEO_EXT.has(entry.extension)) {
    return (
      <div className="rounded-lg bg-black/5 p-2 dark:bg-white/5">
        <video src={fileUrl} controls className={`${maxH} w-full rounded`} />
      </div>
    );
  }
  if (AUDIO_EXT.has(entry.extension)) {
    return (
      <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
        <audio src={fileUrl} controls className="w-full" />
      </div>
    );
  }
  if (entry.extension === "pdf") {
    return <iframe src={fileUrl} title={entry.name} className={`${large ? "h-[75vh]" : "h-56"} w-full rounded bg-white`} />;
  }

  if (loading) {
    return <div className="rounded-lg bg-black/5 p-6 text-center text-xs text-gray-400 dark:bg-white/5">Loading preview…</div>;
  }

  if (docx) {
    return (
      <div
        className={`${large ? "max-h-[75vh]" : "max-h-64"} overflow-auto rounded-lg bg-white p-4 text-sm leading-relaxed text-black [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_p]:mb-2 [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:px-1`}
        dangerouslySetInnerHTML={{ __html: docx.html }}
      />
    );
  }

  if (xlsx) {
    const sheet = xlsx.sheets[activeSheet];
    return (
      <div className={`${large ? "max-h-[75vh]" : "max-h-64"} overflow-auto rounded-lg bg-white text-black`}>
        {xlsx.sheets.length > 1 && (
          <div className="flex gap-1 border-b bg-gray-100 p-1">
            {xlsx.sheets.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setActiveSheet(i)}
                className={`rounded px-2 py-0.5 text-[11px] ${i === activeSheet ? "bg-white font-semibold shadow" : "text-gray-500"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {sheet?.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-gray-200 px-1.5 py-0.5 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sheet?.truncated && <div className="p-1 text-[10px] text-gray-400">Showing partial data ({sheet.totalRows} total rows)</div>}
      </div>
    );
  }

  if (pptx) {
    return (
      <div className={`${large ? "max-h-[75vh]" : "max-h-64"} space-y-2 overflow-auto`}>
        {pptx.slides.map((text, i) => (
          <div key={i} className="rounded-lg border border-black/10 bg-white p-3 text-xs text-black dark:border-white/10">
            <div className="mb-1 text-[10px] font-semibold text-gray-400">Slide {i + 1}</div>
            <div className="whitespace-pre-wrap">{text || "(no text content)"}</div>
          </div>
        ))}
        {pptx.slideCount > pptx.slides.length && (
          <div className="text-center text-[10px] text-gray-400">+{pptx.slideCount - pptx.slides.length} more slides</div>
        )}
      </div>
    );
  }

  if (textContent) {
    return (
      <pre className={`${large ? "max-h-[75vh]" : "max-h-48"} overflow-auto rounded-md bg-black/5 p-2 text-[11px] leading-snug text-gray-700 dark:bg-white/5 dark:text-gray-300`}>
        {textContent.content}
        {textContent.truncated && "\n…(truncated)"}
      </pre>
    );
  }

  return (
    <div className="flex items-center justify-center rounded-lg bg-black/5 p-6 dark:bg-white/5">
      <Icon className={large ? "h-24 w-24 text-gray-400" : "h-16 w-16 text-gray-400"} />
    </div>
  );
}
