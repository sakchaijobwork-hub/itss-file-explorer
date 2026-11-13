import { app, ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import chokidar, { FSWatcher } from "chokidar";
import type { AutomationRule } from "../shared/types";

let storePath: string;
let cache: AutomationRule[] | null = null;
const watchers = new Map<string, FSWatcher>();

function getStorePath() {
  if (!storePath) storePath = path.join(app.getPath("userData"), "automation.json");
  return storePath;
}

async function loadStore(): Promise<AutomationRule[]> {
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

function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

const tagsStorePath = () => path.join(app.getPath("userData"), "tags.json");

async function applyAction(rule: AutomationRule, filePath: string) {
  try {
    if (rule.action === "move" && rule.destDir) {
      const dest = path.join(rule.destDir, path.basename(filePath));
      await fs.mkdir(rule.destDir, { recursive: true });
      await fs.rename(filePath, dest);
    } else if (rule.action === "rename" && rule.renamePattern) {
      const ext = path.extname(filePath);
      const base = path.basename(filePath, ext);
      const newName = rule.renamePattern.replaceAll("{name}", base).replaceAll("{ext}", ext.replace(".", ""));
      await fs.rename(filePath, path.join(path.dirname(filePath), newName));
    } else if (rule.action === "tag" && rule.tag) {
      let store: Record<string, string[]> = {};
      try {
        store = JSON.parse(await fs.readFile(tagsStorePath(), "utf8"));
      } catch {
        store = {};
      }
      const existing = store[filePath] ?? [];
      if (!existing.includes(rule.tag)) store[filePath] = [...existing, rule.tag];
      await fs.writeFile(tagsStorePath(), JSON.stringify(store, null, 2));
    }
  } catch {
    // best-effort automation
  }
}

function startWatcher(rule: AutomationRule) {
  stopWatcher(rule.id);
  if (!rule.enabled) return;
  const regex = globToRegex(rule.pattern);
  const watcher = chokidar.watch(rule.watchDir, { depth: 0, ignoreInitial: true });
  watcher.on("add", (filePath) => {
    if (regex.test(path.basename(filePath))) applyAction(rule, filePath);
  });
  watchers.set(rule.id, watcher);
}

function stopWatcher(id: string) {
  const w = watchers.get(id);
  if (w) {
    w.close();
    watchers.delete(id);
  }
}

export function registerAutomationIpc() {
  ipcMain.handle("automation:list", async () => loadStore());

  ipcMain.handle("automation:add", async (_e, rule: AutomationRule) => {
    const store = await loadStore();
    store.push(rule);
    await saveStore();
    startWatcher(rule);
    return store;
  });

  ipcMain.handle("automation:remove", async (_e, id: string) => {
    const store = await loadStore();
    cache = store.filter((r) => r.id !== id);
    await saveStore();
    stopWatcher(id);
    return cache;
  });

  ipcMain.handle("automation:toggle", async (_e, id: string) => {
    const store = await loadStore();
    const rule = store.find((r) => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      await saveStore();
      startWatcher(rule);
    }
    return store;
  });

  // start watchers for enabled rules on boot
  loadStore().then((rules) => rules.forEach((r) => startWatcher(r)));
}
