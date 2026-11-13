import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import type { RemoteEntry, RemoteProtocol } from "@/types";
import { Folder, File as FileIcon, Download, Upload, ChevronLeft, ExternalLink } from "lucide-react";
import { formatBytes } from "@/utils/format";

type DialogProtocol = RemoteProtocol | "smb";

export function RemoteDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

  const [protocol, setProtocol] = useState<DialogProtocol>("sftp");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [webdavUrl, setWebdavUrl] = useState("");
  const [smbShare, setSmbShare] = useState("");
  const [smbOpened, setSmbOpened] = useState(false);

  const [connId, setConnId] = useState<string | null>(null);
  const [path, setPath] = useState("/");
  const [history, setHistory] = useState<string[]>([]);
  const [entries, setEntries] = useState<RemoteEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (protocol === "smb") {
      setBusy(true);
      setError(null);
      try {
        await window.fileAPI.openSmbShare(host, smbShare || undefined, user || undefined);
        setSmbOpened(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not open smb:// — check the host/share.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const id = await window.fileAPI.remoteConnect({
        protocol,
        host,
        port: port ? Number(port) : undefined,
        user,
        password,
        url: protocol === "webdav" ? webdavUrl : undefined,
      });
      setConnId(id);
      const list = await window.fileAPI.remoteListDir(id, "/");
      setEntries(list);
      setPath("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  }

  async function openDir(p: string) {
    if (!connId) return;
    setBusy(true);
    try {
      const list = await window.fileAPI.remoteListDir(connId, p);
      setEntries(list);
      setHistory((h) => [...h, path]);
      setPath(p);
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (history.length === 0 || !connId) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    window.fileAPI.remoteListDir(connId, prev).then(setEntries);
    setPath(prev);
  }

  async function downloadEntry(entry: RemoteEntry) {
    if (!connId || !activeTab) return;
    const localPath = `${activeTab.path}/${entry.name}`;
    setBusy(true);
    try {
      await window.fileAPI.remoteDownload(connId, entry.path, localPath);
    } finally {
      setBusy(false);
    }
  }

  const selectedPaths = useFileStore((s) => s.selectedPaths);

  async function uploadSelected() {
    if (!connId || selectedPaths.size === 0) return;
    setBusy(true);
    try {
      for (const local of selectedPaths) {
        const name = local.split(/[/\\]/).pop() ?? local;
        const remotePath = path.endsWith("/") ? `${path}${name}` : `${path}/${name}`;
        await window.fileAPI.remoteUpload(connId, local, remotePath);
      }
      const list = await window.fileAPI.remoteListDir(connId, path);
      setEntries(list);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (connId) await window.fileAPI.remoteDisconnect(connId);
    setConnId(null);
    setEntries([]);
  }

  return (
    <Modal title="Remote Connection (FTP / SFTP / WebDAV / SMB)" onClose={() => { disconnect(); closeModal(); }} width="560px">
      {!connId ? (
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            {(["sftp", "ftp", "webdav", "smb"] as DialogProtocol[]).map((p) => (
              <button
                key={p}
                onClick={() => setProtocol(p)}
                className={`rounded-md px-3 py-1 text-xs uppercase ${
                  protocol === p ? "bg-accent text-white" : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {protocol === "smb" ? (
            <>
              <p className="text-[11px] text-gray-400">
                SMB shares (network drives, Parallels/VM drives, NAS) are handed off to{" "}
                {window.fileAPI.platform === "darwin" ? "Finder's" : "the OS's"} native connect flow — it owns the
                actual mount and any login prompt. Once mounted it shows up like any other drive.
              </p>
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="Host or hostname.local (e.g. Windows-11._smb._tcp.local)"
                className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
              />
              <input
                value={smbShare}
                onChange={(e) => setSmbShare(e.target.value)}
                placeholder="Share name (optional — leave blank to browse available shares)"
                className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
              />
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Username (optional — leave blank for Guest)"
                className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
              />
            </>
          ) : protocol === "webdav" ? (
            <input
              value={webdavUrl}
              onChange={(e) => setWebdavUrl(e.target.value)}
              placeholder="https://example.com/remote.php/webdav/"
              className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
            />
          ) : (
            <div className="flex gap-2">
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="Host"
                className="flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
              />
              <input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder={protocol === "sftp" ? "22" : "21"}
                className="w-20 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
              />
            </div>
          )}
          {protocol !== "smb" && (
            <>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Username"
                className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
              />
            </>
          )}
          {error && <div className="text-xs text-red-500">{error}</div>}
          {smbOpened && protocol === "smb" && (
            <div className="rounded-md bg-green-500/10 p-2 text-[11px] text-green-600 dark:text-green-400">
              Handed off to {window.fileAPI.platform === "darwin" ? "Finder" : "the OS"} — finish any login prompt
              there, then close this dialog and look for the new drive in the sidebar.
            </div>
          )}
          <div className="flex justify-end pt-1">
            <button
              onClick={connect}
              disabled={busy || (protocol === "smb" && !host)}
              className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40"
            >
              {protocol === "smb" && <ExternalLink className="h-3.5 w-3.5" />}
              {busy ? "Connecting…" : protocol === "smb" ? "Open in Finder/Explorer" : "Connect"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button onClick={goBack} disabled={history.length === 0} className="rounded p-1 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="truncate font-mono">{path}</span>
            <button onClick={disconnect} className="ml-auto text-red-500 hover:underline">
              Disconnect
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-md border border-black/10 dark:border-white/10">
            {entries.map((entry) => (
              <div
                key={entry.path}
                className="flex items-center gap-2 border-b border-black/5 px-2 py-1.5 text-xs last:border-0 dark:border-white/5"
              >
                {entry.isDirectory ? (
                  <button onClick={() => openDir(entry.path)} className="flex flex-1 items-center gap-2 text-left hover:text-accent">
                    <Folder className="h-3.5 w-3.5 text-accent" /> {entry.name}
                  </button>
                ) : (
                  <span className="flex flex-1 items-center gap-2">
                    <FileIcon className="h-3.5 w-3.5 text-gray-400" /> {entry.name}
                    <span className="text-gray-400">{formatBytes(entry.size)}</span>
                  </span>
                )}
                {!entry.isDirectory && (
                  <button onClick={() => downloadEntry(entry)} title="Download to current folder" className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {entries.length === 0 && <div className="p-4 text-center text-gray-400">Empty</div>}
          </div>
          <button
            onClick={uploadSelected}
            disabled={selectedPaths.size === 0 || busy}
            className="flex items-center gap-1.5 rounded-md bg-black/5 px-3 py-1.5 text-xs hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload {selectedPaths.size > 0 ? `${selectedPaths.size} selected item(s)` : "(select files in the main pane first)"}
          </button>
        </div>
      )}
    </Modal>
  );
}
