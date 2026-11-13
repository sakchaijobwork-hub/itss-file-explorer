import { ipcMain, shell } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import type { ParallelsVm } from "../shared/types";

const execFileAsync = promisify(execFile);

const PRLCTL_PATHS = ["/usr/local/bin/prlctl", "/usr/bin/prlctl"];

function findPrlctl(): string | null {
  if (process.platform !== "darwin") return null;
  return PRLCTL_PATHS.find((p) => fsSync.existsSync(p)) ?? null;
}

async function listRawVms(prlctlPath: string): Promise<{ uuid: string; name: string; status: string }[]> {
  try {
    const { stdout } = await execFileAsync(prlctlPath, ["list", "-a", "-j"], { timeout: 5000 });
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed)
      ? parsed.map((v) => ({ uuid: v.uuid, name: v.name, status: v.status }))
      : [];
  } catch {
    return [];
  }
}

async function findMountedPathFor(vmName: string): Promise<string | null> {
  try {
    const volumes = await fs.readdir("/Volumes");
    const lowerName = vmName.toLowerCase();
    const match = volumes.find((v) => v.toLowerCase().includes(lowerName));
    return match ? `/Volumes/${match}` : null;
  } catch {
    return null;
  }
}

async function isAccessible(path: string): Promise<boolean> {
  try {
    await fs.readdir(path);
    return true;
  } catch {
    return false;
  }
}

export async function isParallelsAvailable(): Promise<boolean> {
  return findPrlctl() !== null;
}

export async function listParallelsVms(): Promise<ParallelsVm[]> {
  const prlctlPath = findPrlctl();
  if (!prlctlPath) return [];

  const raw = await listRawVms(prlctlPath);
  const results: ParallelsVm[] = [];
  for (const vm of raw) {
    const mountedPath = await findMountedPathFor(vm.name);
    const accessible = mountedPath ? await isAccessible(mountedPath) : false;
    results.push({ uuid: vm.uuid, name: vm.name, status: vm.status, mountedPath, accessible });
  }
  return results;
}

/**
 * Hands off to macOS's native "Connect to Server" flow for this VM's Bonjour
 * SMB service (the same mechanism Parallels itself sets up for "Share Windows
 * folders with Mac" / "Access Windows from Mac"). This never touches the
 * filesystem directly — macOS owns the actual mount/auth prompt, exactly as
 * if the user had typed the address into Finder themselves.
 */
export async function reconnectParallelsVm(vmName: string): Promise<void> {
  const url = `smb://GUEST:@${encodeURIComponent(vmName)}._smb._tcp.local/`;
  await shell.openExternal(url);
}

export function registerParallelsIpc() {
  ipcMain.handle("parallels:isAvailable", () => isParallelsAvailable());
  ipcMain.handle("parallels:listVms", () => listParallelsVms());
  ipcMain.handle("parallels:reconnect", (_e, vmName: string) => reconnectParallelsVm(vmName));
}
