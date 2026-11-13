import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import type { ExifData } from "@/types";
import { basename } from "@/utils/format";

type Kind = "resize" | "rotate" | "convert";

export function ImageToolsDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const targetPaths = useUiStore((s) => s.modalTargetPaths);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

  const [kind, setKind] = useState<Kind>("resize");
  const [width, setWidth] = useState(800);
  const [degrees, setDegrees] = useState(90);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp" | "bmp">("png");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [exif, setExif] = useState<ExifData | null>(null);

  useEffect(() => {
    if (targetPaths.length === 1) {
      window.fileAPI.getExif(targetPaths[0]).then(setExif);
    } else {
      setExif(null);
    }
  }, [targetPaths]);

  async function run() {
    if (!activeTab) return;
    setBusy(true);
    try {
      const op =
        kind === "resize"
          ? { kind: "resize" as const, width }
          : kind === "rotate"
            ? { kind: "rotate" as const, degrees }
            : { kind: "convert" as const, format };
      const out = await window.fileAPI.batchImageOp(targetPaths, activeTab.path, op);
      setResults(out);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Image Tools" onClose={closeModal} width="440px">
      <div className="space-y-3 text-sm">
        <div className="text-xs text-gray-400">{targetPaths.length} image(s): {targetPaths.map(basename).join(", ")}</div>

        {exif && (
          <div className="rounded-md bg-black/5 p-2 text-[11px] text-gray-600 dark:bg-white/5 dark:text-gray-300">
            {exif.make && <div>Camera: {exif.make} {exif.model}</div>}
            {exif.width && exif.height && <div>Dimensions: {exif.width}×{exif.height}</div>}
            {exif.dateTaken && <div>Date taken: {new Date(exif.dateTaken).toLocaleString()}</div>}
            {exif.iso && <div>ISO: {exif.iso} · f/{exif.fNumber} · {exif.focalLength}mm</div>}
            {exif.gpsLatitude && <div>GPS: {exif.gpsLatitude.toFixed(5)}, {exif.gpsLongitude?.toFixed(5)}</div>}
            {!exif.make && !exif.gpsLatitude && !exif.width && <div>No EXIF metadata found</div>}
          </div>
        )}

        <div className="flex gap-2">
          {(["resize", "rotate", "convert"] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-md px-3 py-1 text-xs capitalize ${
                kind === k ? "bg-accent text-white" : "bg-black/5 dark:bg-white/10"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {kind === "resize" && (
          <label className="flex items-center gap-2 text-xs">
            Width (px)
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-24 rounded-md border border-black/10 bg-transparent px-2 py-1 outline-none focus:border-accent dark:border-white/10"
            />
          </label>
        )}
        {kind === "rotate" && (
          <div className="flex gap-2">
            {[90, 180, 270].map((d) => (
              <button
                key={d}
                onClick={() => setDegrees(d)}
                className={`rounded-md px-3 py-1 text-xs ${degrees === d ? "bg-accent text-white" : "bg-black/5 dark:bg-white/10"}`}
              >
                {d}°
              </button>
            ))}
          </div>
        )}
        {kind === "convert" && (
          <div className="flex gap-2">
            {(["png", "jpeg", "webp", "bmp"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-md px-3 py-1 text-xs uppercase ${format === f ? "bg-accent text-white" : "bg-black/5 dark:bg-white/10"}`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="rounded-md bg-green-500/10 p-2 text-[11px] text-green-600 dark:text-green-400">
            Created {results.length} file(s) in {activeTab?.path}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Close
          </button>
          <button
            onClick={run}
            disabled={busy || targetPaths.length === 0}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "Processing…" : "Apply"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
