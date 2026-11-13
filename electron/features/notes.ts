import { app, ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

interface NotesStore {
  [filePath: string]: string;
}

let storePath: string;
let cache: NotesStore | null = null;

function getStorePath() {
  if (!storePath) storePath = path.join(app.getPath("userData"), "notes.json");
  return storePath;
}

async function loadStore(): Promise<NotesStore> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(getStorePath(), "utf8"));
  } catch {
    cache = {};
  }
  return cache!;
}

async function saveStore() {
  await fs.writeFile(getStorePath(), JSON.stringify(cache ?? {}, null, 2));
}

export function registerNotesIpc() {
  ipcMain.handle("notes:getAll", async () => loadStore());
  ipcMain.handle("notes:set", async (_e, filePath: string, text: string) => {
    const store = await loadStore();
    if (!text.trim()) delete store[filePath];
    else store[filePath] = text;
    await saveStore();
    return store;
  });
}
