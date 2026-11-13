import { app, ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

interface RecentEntry {
  path: string;
  openedAt: number;
}

let storePath: string;
let cache: RecentEntry[] | null = null;
const MAX_RECENTS = 40;

function getStorePath() {
  if (!storePath) storePath = path.join(app.getPath("userData"), "recents.json");
  return storePath;
}

async function loadStore(): Promise<RecentEntry[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(getStorePath(), "utf8");
    cache = JSON.parse(raw);
  } catch {
    cache = [];
  }
  return cache!;
}

async function saveStore() {
  await fs.writeFile(getStorePath(), JSON.stringify(cache ?? [], null, 2));
}

export function registerRecentsIpc() {
  ipcMain.handle("recents:list", async () => loadStore());

  ipcMain.handle("recents:add", async (_e, filePath: string) => {
    const store = await loadStore();
    const next = [{ path: filePath, openedAt: Date.now() }, ...store.filter((r) => r.path !== filePath)].slice(
      0,
      MAX_RECENTS
    );
    cache = next;
    await saveStore();
    return next;
  });

  ipcMain.handle("recents:clear", async () => {
    cache = [];
    await saveStore();
    return cache;
  });
}
