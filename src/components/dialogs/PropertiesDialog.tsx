import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import type { FileEntry, PermissionsInfo } from "@/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

function formatDate(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

const HASH_ALGOS = ["sha256", "sha1", "md5"] as const;

export function PropertiesDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const targetPaths = useUiStore((s) => s.modalTargetPaths);
  const targetPath = targetPaths[0];

  const [entry, setEntry] = useState<FileEntry | null>(null);
  const [permissions, setPermissions] = useState<PermissionsInfo | null>(null);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [folderSize, setFolderSize] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [hashAlgo, setHashAlgo] = useState<(typeof HASH_ALGOS)[number]>("sha256");
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!targetPath) return;
    setEntry(null);
    setPermissions(null);
    setLinkTarget(null);
    setFolderSize(null);
    setHash(null);
    window.fileAPI.getInfo(targetPath).then(setEntry);
    window.fileAPI.getPermissions(targetPath).then(setPermissions);
  }, [targetPath]);

  useEffect(() => {
    if (entry?.isSymlink && targetPath) {
      window.fileAPI.readLinkTarget(targetPath).then(setLinkTarget).catch(() => setLinkTarget(null));
    }
  }, [entry?.isSymlink, targetPath]);

  async function calculateFolderSize() {
    if (!targetPath) return;
    setCalculating(true);
    try {
      setFolderSize(await window.fileAPI.getFolderSize(targetPath));
    } finally {
      setCalculating(false);
    }
  }

  async function computeHash() {
    if (!targetPath) return;
    setHashing(true);
    setCopied(false);
    try {
      setHash(await window.fileAPI.hashFile(targetPath, hashAlgo));
    } finally {
      setHashing(false);
    }
  }

  async function copyHash() {
    if (!hash) return;
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!targetPath || !entry) return null;

  return (
    <Modal title="Properties" onClose={closeModal} width="440px">
      <div className="space-y-4 text-sm">
        <div>
          <div className="truncate font-medium">{entry.name}</div>
          <div className="truncate text-xs text-gray-400">{targetPath}</div>
        </div>

        <div className="grid grid-cols-[100px_1fr] gap-y-1.5 text-xs">
          <div className="text-gray-400">Type</div>
          <div>
            {entry.isSymlink ? "Symbolic Link" : entry.isDirectory ? "Folder" : entry.extension ? `.${entry.extension} File` : "File"}
          </div>

          {entry.isSymlink && (
            <>
              <div className="text-gray-400">Target</div>
              <div className="truncate">{linkTarget ?? "Resolving…"}</div>
            </>
          )}

          <div className="text-gray-400">Size</div>
          <div>
            {entry.isDirectory ? (
              folderSize !== null ? (
                `${formatBytes(folderSize)} (${folderSize.toLocaleString()} bytes)`
              ) : (
                <button
                  onClick={calculateFolderSize}
                  disabled={calculating}
                  className="rounded bg-black/5 px-2 py-0.5 text-[11px] hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  {calculating ? "Calculating…" : "Calculate"}
                </button>
              )
            ) : (
              `${formatBytes(entry.size)} (${entry.size.toLocaleString()} bytes)`
            )}
          </div>

          <div className="text-gray-400">Modified</div>
          <div>{formatDate(entry.modifiedAt)}</div>
          <div className="text-gray-400">Created</div>
          <div>{formatDate(entry.createdAt)}</div>

          {permissions && (
            <>
              <div className="text-gray-400">Permissions</div>
              <div>
                {permissions.mode} ({permissions.octal})
              </div>
            </>
          )}
        </div>

        {!entry.isDirectory && (
          <div className="space-y-2 border-t border-black/10 pt-3 dark:border-white/10">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Checksum</div>
            <div className="flex items-center gap-2">
              <select
                value={hashAlgo}
                onChange={(e) => {
                  setHashAlgo(e.target.value as (typeof HASH_ALGOS)[number]);
                  setHash(null);
                }}
                className="rounded-md border border-black/10 bg-transparent px-2 py-1 text-xs outline-none dark:border-white/10"
              >
                {HASH_ALGOS.map((a) => (
                  <option key={a} value={a}>
                    {a.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                onClick={computeHash}
                disabled={hashing}
                className="rounded-md bg-black/5 px-2.5 py-1 text-xs hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:hover:bg-white/20"
              >
                {hashing ? "Computing…" : "Compute"}
              </button>
              {hash && (
                <button
                  onClick={copyHash}
                  className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
            {hash && <div className="break-all rounded bg-black/5 p-1.5 font-mono text-[11px] dark:bg-white/5">{hash}</div>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={closeModal} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
