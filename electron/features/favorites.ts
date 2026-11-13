import { app, ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface FavoriteEntry {
  name: string;
  path: string;
}

let storePath: string;
let cache: FavoriteEntry[] | null = null;

function getStorePath() {
  if (!storePath) storePath = path.join(app.getPath("userData"), "favorites.json");
  return storePath;
}

async function loadStore(): Promise<FavoriteEntry[]> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(getStorePath(), "utf8"));
  } catch {
    cache = [];
  }
  return cache!;
}

async function saveStore() {
  await fs.writeFile(getStorePath(), JSON.stringify(cache ?? [], null, 2));
}

export function registerFavoritesIpc() {
  ipcMain.handle("favorites:list", async () => loadStore());

  ipcMain.handle("favorites:add", async (_e, folderPath: string) => {
    const store = await loadStore();
    if (!store.some((f) => f.path === folderPath)) {
      store.push({ name: path.basename(folderPath) || folderPath, path: folderPath });
      await saveStore();
    }
    return store;
  });

  ipcMain.handle("favorites:remove", async (_e, folderPath: string) => {
    cache = (await loadStore()).filter((f) => f.path !== folderPath);
    await saveStore();
    return cache;
  });
}
