import { app, ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface FavoriteEntry {
  name: string;
  path: string;
  isDirectory: boolean;
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
    const raw: Partial<FavoriteEntry>[] = JSON.parse(await fs.readFile(getStorePath(), "utf8"));
    // Favorites saved before file-favoriting existed have no isDirectory
    // field — they were always folders, so default it to true.
    cache = raw.map((f) => ({ name: f.name ?? path.basename(f.path!), path: f.path!, isDirectory: f.isDirectory ?? true }));
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

  ipcMain.handle("favorites:add", async (_e, targetPath: string, isDirectory = true) => {
    const store = await loadStore();
    if (!store.some((f) => f.path === targetPath)) {
      store.push({ name: path.basename(targetPath) || targetPath, path: targetPath, isDirectory });
      await saveStore();
    }
    return store;
  });

  ipcMain.handle("favorites:remove", async (_e, targetPath: string) => {
    const store = await loadStore();
    const removed = store.find((f) => f.path === targetPath);
    // Removing a favorited folder also drops any favorited files nested
    // directly inside it, since those files are only shown grouped under
    // that folder in the sidebar and would otherwise become orphaned.
    cache = store.filter((f) => f.path !== targetPath && !(removed?.isDirectory && path.dirname(f.path) === targetPath));
    await saveStore();
    return cache;
  });

  ipcMain.handle("favorites:reorder", async (_e, orderedPaths: string[]) => {
    const store = await loadStore();
    const byPath = new Map(store.map((f) => [f.path, f]));
    const reordered = orderedPaths.map((p) => byPath.get(p)).filter((f): f is FavoriteEntry => !!f);
    // Keep any favorite the caller didn't mention (defensive — shouldn't
    // normally happen) so a stale/partial list can never silently drop one.
    for (const f of store) {
      if (!orderedPaths.includes(f.path)) reordered.push(f);
    }
    cache = reordered;
    await saveStore();
    return cache;
  });
}
