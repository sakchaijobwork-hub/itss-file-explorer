import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { basename } from "@/utils/format";

export function NotesDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const targetPaths = useUiStore((s) => s.modalTargetPaths);
  const targetPath = targetPaths[0];
  const [text, setText] = useState("");

  useEffect(() => {
    if (!targetPath) return;
    window.fileAPI.getAllNotes().then((notes) => setText(notes[targetPath] ?? ""));
  }, [targetPath]);

  async function save() {
    if (!targetPath) return;
    await window.fileAPI.setNote(targetPath, text);
    closeModal();
  }

  if (!targetPath) return null;

  return (
    <Modal title="File Note" onClose={closeModal} width="420px">
      <div className="space-y-3 text-sm">
        <div className="text-xs text-gray-400">{basename(targetPath)}</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Write a note about this file…"
          className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Cancel
          </button>
          <button onClick={save} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover">
            Save Note
          </button>
        </div>
      </div>
    </Modal>
  );
}
