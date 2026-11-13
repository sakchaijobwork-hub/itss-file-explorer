import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import { basename } from "@/utils/format";

type Mode = "merge" | "extract" | "split" | "rotate" | "imagesToPdf";

export function PdfToolsDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const targetPaths = useUiStore((s) => s.modalTargetPaths);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

  const pdfPaths = targetPaths.filter((p) => p.toLowerCase().endsWith(".pdf"));
  const imagePaths = targetPaths.filter((p) => /\.(png|jpe?g)$/i.test(p));

  const [mode, setMode] = useState<Mode>(
    pdfPaths.length > 1 ? "merge" : imagePaths.length > 0 && pdfPaths.length === 0 ? "imagesToPdf" : "extract"
  );
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [ranges, setRanges] = useState("1-1");
  const [pagesPerFile, setPagesPerFile] = useState(1);
  const [rotateDegrees, setRotateDegrees] = useState(90);
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableModes: { id: Mode; label: string }[] = [
    { id: "merge", label: "Merge" },
    { id: "extract", label: "Extract Pages" },
    { id: "split", label: "Split" },
    { id: "rotate", label: "Rotate" },
    { id: "imagesToPdf", label: "Images → PDF" },
  ];

  useEffect(() => {
    if ((mode === "extract" || mode === "split" || mode === "rotate") && pdfPaths.length === 1) {
      window.fileAPI.getPdfPageCount(pdfPaths[0]).then(setPageCount).catch(() => setPageCount(null));
    }
  }, [mode, pdfPaths]);

  async function run() {
    if (!activeTab) return;
    setBusy(true);
    setError(null);
    setResultMsg(null);
    try {
      if (mode === "merge") {
        if (pdfPaths.length < 2) throw new Error("Select 2 or more PDF files to merge.");
        const dest = await window.fileAPI.saveDialog(`${activeTab.path}/merged.pdf`, [{ name: "PDF", extensions: ["pdf"] }]);
        if (!dest) return;
        await window.fileAPI.mergePdfs(pdfPaths, dest);
        setResultMsg(`Merged ${pdfPaths.length} PDFs into ${basename(dest)}`);
      } else if (mode === "extract") {
        if (pdfPaths.length !== 1) throw new Error("Select exactly one PDF file.");
        const dest = await window.fileAPI.saveDialog(`${activeTab.path}/extracted.pdf`, [{ name: "PDF", extensions: ["pdf"] }]);
        if (!dest) return;
        await window.fileAPI.extractPdfPages(pdfPaths[0], ranges, dest);
        setResultMsg(`Extracted pages ${ranges} into ${basename(dest)}`);
      } else if (mode === "split") {
        if (pdfPaths.length !== 1) throw new Error("Select exactly one PDF file.");
        const outputs = await window.fileAPI.splitPdfEveryNPages(pdfPaths[0], pagesPerFile, activeTab.path);
        setResultMsg(`Created ${outputs.length} file(s) in ${activeTab.path}`);
      } else if (mode === "rotate") {
        if (pdfPaths.length !== 1) throw new Error("Select exactly one PDF file.");
        const dest = await window.fileAPI.saveDialog(`${activeTab.path}/rotated.pdf`, [{ name: "PDF", extensions: ["pdf"] }]);
        if (!dest) return;
        await window.fileAPI.rotatePdfPages(pdfPaths[0], rotateDegrees, dest, ranges || undefined);
        setResultMsg(`Rotated → ${basename(dest)}`);
      } else if (mode === "imagesToPdf") {
        if (imagePaths.length === 0) throw new Error("Select one or more PNG/JPG images.");
        const dest = await window.fileAPI.saveDialog(`${activeTab.path}/images.pdf`, [{ name: "PDF", extensions: ["pdf"] }]);
        if (!dest) return;
        await window.fileAPI.imagesToPdf(imagePaths, dest);
        setResultMsg(`Created ${basename(dest)} from ${imagePaths.length} image(s)`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="PDF Tools" onClose={closeModal} width="440px">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {availableModes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-md px-3 py-1 text-xs ${mode === m.id ? "bg-accent text-white" : "bg-black/5 dark:bg-white/10"}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-400">
          {mode === "imagesToPdf"
            ? `${imagePaths.length} image(s) selected`
            : `${pdfPaths.length} PDF(s) selected${pageCount ? ` · ${pageCount} pages` : ""}`}
        </div>

        {(mode === "extract" || mode === "rotate") && (
          <label className="block text-xs">
            Page range (e.g. 1-3,5)
            <input
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
            />
          </label>
        )}

        {mode === "split" && (
          <label className="block text-xs">
            Pages per file
            <input
              type="number"
              min={1}
              value={pagesPerFile}
              onChange={(e) => setPagesPerFile(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-24 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
            />
          </label>
        )}

        {mode === "rotate" && (
          <div className="flex gap-2">
            {[90, 180, 270].map((d) => (
              <button
                key={d}
                onClick={() => setRotateDegrees(d)}
                className={`rounded-md px-3 py-1 text-xs ${rotateDegrees === d ? "bg-accent text-white" : "bg-black/5 dark:bg-white/10"}`}
              >
                {d}°
              </button>
            ))}
          </div>
        )}

        {error && <div className="text-xs text-red-500">{error}</div>}
        {resultMsg && (
          <div className="rounded-md bg-green-500/10 p-2 text-[11px] text-green-600 dark:text-green-400">{resultMsg}</div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Close
          </button>
          <button
            onClick={run}
            disabled={busy}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "Working…" : "Apply"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
