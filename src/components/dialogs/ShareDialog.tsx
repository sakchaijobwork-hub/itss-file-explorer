import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import type { ShareInfo } from "@/types";
import { basename } from "@/utils/format";

export function ShareDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const targetPaths = useUiStore((s) => s.modalTargetPaths);
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.fileAPI.startShare(targetPaths).then((res) => {
      setInfo(res);
      setLoading(false);
    });
    return () => {
      window.fileAPI.stopShare();
    };
  }, []);

  return (
    <Modal title="Share on Local Network" onClose={closeModal} width="360px">
      <div className="space-y-3 text-center text-sm">
        <div className="text-xs text-gray-400">
          Sharing {targetPaths.length} item(s): {targetPaths.map(basename).join(", ")}
        </div>
        {loading && <div className="py-8 text-xs text-gray-400">Starting local server…</div>}
        {info && (
          <>
            <img src={info.qrDataUrl} alt="QR code" className="mx-auto h-40 w-40 rounded-lg bg-white p-2" />
            <div className="break-all rounded-md bg-black/5 p-2 text-[11px] font-mono text-gray-600 dark:bg-white/5 dark:text-gray-300">
              {info.url}
            </div>
            <p className="text-[11px] text-gray-400">
              Scan the QR code or open this link from any device on the same Wi-Fi/LAN to download the file(s). Closing this dialog stops sharing.
            </p>
          </>
        )}
        <div className="flex justify-end pt-1">
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Stop Sharing
          </button>
        </div>
      </div>
    </Modal>
  );
}
