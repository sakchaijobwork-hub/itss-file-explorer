import { ipcMain, shell } from "electron";

/**
 * Hands an smb:// URL to the OS's native "Connect to Server" flow (Finder on
 * macOS, Explorer's network-mapping dialog on Windows via `shell.openExternal`
 * too). The OS owns the actual mount and any credential prompt — this never
 * touches the filesystem directly. Once mounted, the share shows up as a
 * normal path (e.g. under /Volumes on macOS) and the existing drives list
 * picks it up like any other volume.
 */
export async function openSmbShare(host: string, share?: string, user?: string): Promise<void> {
  const auth = user ? `${encodeURIComponent(user)}@` : "GUEST:@";
  const sharePart = share ? `/${encodeURIComponent(share)}` : "";
  const url = `smb://${auth}${host}${sharePart}`;
  await shell.openExternal(url);
}

export function registerNetworkIpc() {
  ipcMain.handle("network:openSmbShare", (_e, host: string, share?: string, user?: string) =>
    openSmbShare(host, share, user)
  );
}
