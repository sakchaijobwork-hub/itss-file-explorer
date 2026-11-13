import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { basename } from "@/utils/format";

export function PasswordDialog({ mode }: { mode: "encrypt" | "decrypt" }) {
  const closeModal = useUiStore((s) => s.closeModal);
  const targetPaths = useUiStore((s) => s.modalTargetPaths);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEncrypt = mode === "encrypt";

  async function run() {
    setError(null);
    if (!password) {
      setError("Enter a password");
      return;
    }
    if (isEncrypt && password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      for (const p of targetPaths) {
        if (isEncrypt) await window.fileAPI.encryptFile(p, password);
        else await window.fileAPI.decryptFile(p, password);
      }
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={isEncrypt ? "Encrypt Files" : "Decrypt Files"} onClose={closeModal} width="400px">
      <div className="space-y-3 text-sm">
        <div className="text-xs text-gray-500">
          {targetPaths.length} item(s): {targetPaths.map((p) => basename(p)).join(", ")}
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
        />
        {isEncrypt && (
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
          />
        )}
        {error && <div className="text-xs text-red-500">{error}</div>}
        <p className="text-[11px] text-gray-400">
          {isEncrypt
            ? "Creates a new .enc file alongside the original (AES-256-GCM). The original is left untouched."
            : "Decrypts a .enc file created by this app back to its original content."}
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={run}
            disabled={busy}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "Working…" : isEncrypt ? "Encrypt" : "Decrypt"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
