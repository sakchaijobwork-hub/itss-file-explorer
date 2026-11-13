import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { FolderOpen } from "lucide-react";

export function AboutDialog() {
  const closeModal = useUiStore((s) => s.closeModal);

  return (
    <Modal title="About" onClose={closeModal} width="340px">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <FolderOpen className="h-14 w-14 text-accent" />
        <div className="text-base font-semibold text-gray-800 dark:text-gray-100">ITSS File Explorer</div>
        <div className="text-xs text-gray-400">Version 0.1.0</div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          A cross-platform file manager for macOS and Windows, built with Electron, React and TypeScript.
        </p>
        <div className="mt-2 text-[11px] text-gray-400">Platform: {window.fileAPI.platform}</div>
      </div>
    </Modal>
  );
}
