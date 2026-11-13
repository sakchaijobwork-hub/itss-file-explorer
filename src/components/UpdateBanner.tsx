import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import type { UpdateStatus } from "@/types";

export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    return window.fileAPI.onUpdateStatus((s) => {
      setStatus(s);
      if (s.state === "available") setDismissed(false);
    });
  }, []);

  if (!status || dismissed) return null;
  if (status.state === "checking" || status.state === "not-available") return null;

  return (
    <div className="no-drag flex h-8 shrink-0 items-center justify-center gap-3 border-b border-accent/20 bg-accent/10 px-3 text-xs text-accent">
      {status.state === "available" && (
        <>
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Update {status.version} is available.</span>
          <button onClick={() => window.fileAPI.downloadUpdate()} className="flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-white">
            <Download className="h-3 w-3" /> Download
          </button>
        </>
      )}
      {status.state === "downloading" && <span>Downloading update… {status.percent}%</span>}
      {status.state === "downloaded" && (
        <>
          <span>Update {status.version} ready to install.</span>
          <button onClick={() => window.fileAPI.installUpdate()} className="rounded bg-accent px-2 py-0.5 text-white">
            Restart &amp; Install
          </button>
        </>
      )}
      {status.state === "error" && <span className="text-red-500">Update check failed: {status.message}</span>}
      <button onClick={() => setDismissed(true)} className="ml-2 rounded p-0.5 hover:bg-black/10">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
