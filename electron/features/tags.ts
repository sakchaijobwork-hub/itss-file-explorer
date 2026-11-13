import { app, ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const TAG_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "gray"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

interface TagsStore {
  [filePath: string]: TagColor[];
}

let storePath: string;
let cache: TagsStore | null = null;

function getStorePath() {
  if (!storePath) storePath = path.join(app.getPath("userData"), "tags.json");
  return storePath;
}

async function loadStore(): Promise<TagsStore> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(getStorePath(), "utf8");
    cache = JSON.parse(raw);
  } catch {
    cache = {};
  }
  return cache!;
}

async function saveStore() {
  await fs.writeFile(getStorePath(), JSON.stringify(cache ?? {}, null, 2));
}

export function registerTagsIpc() {
  ipcMain.handle("tags:getAll", async () => loadStore());

  ipcMain.handle("tags:set", async (_e, filePath: string, tags: TagColor[]) => {
    const store = await loadStore();
    if (tags.length === 0) delete store[filePath];
    else store[filePath] = tags;
    await saveStore();
    return store;
  });

  ipcMain.handle("tags:toggle", async (_e, filePath: string, tag: TagColor) => {
    const store = await loadStore();
    const existing = store[filePath] ?? [];
    const next = existing.includes(tag) ? existing.filter((t) => t !== tag) : [...existing, tag];
    if (next.length === 0) delete store[filePath];
    else store[filePath] = next;
    await saveStore();
    return store;
  });
}
