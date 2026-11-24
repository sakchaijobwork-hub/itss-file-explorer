import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { FolderIcon } from "@/components/icons/FolderIcon";

export function AboutDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const [version, setVersion] = useState("");

  useEffect(() => {
    window.fileAPI.getCurrentVersion().then(setVersion);
  }, []);

  return (
    <Modal title="About" onClose={closeModal} width="340px">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <FolderIcon className="h-14 w-14" />
        <div className="text-base font-semibold text-gray-800 dark:text-gray-100">ITSS File Explorer</div>
        <div className="text-xs text-gray-400">Version {version || "…"}</div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          A cross-platform file manager for macOS and Windows, built with Electron, React and TypeScript.
        </p>
        <div className="mt-2 text-[11px] text-gray-400">Platform: {window.fileAPI.platform}</div>
      </div>
    </Modal>
  );
}
