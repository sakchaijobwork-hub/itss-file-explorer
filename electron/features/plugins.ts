import { app, ipcMain, shell } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PluginInfo } from "../shared/types";

interface LoadedPlugin {
  id: string;
  label: string;
  fileName: string;
  run: (context: { selectedPaths: string[]; currentPath: string }) => unknown;
}

const EXAMPLE_PLUGIN = `// Example ITSS File Explorer plugin
// Place .js files like this in the plugins folder. Each must export { id, label, run }.
module.exports = {
  id: "example-uppercase-names",
  label: "Example: Log Selected Names",
  run(context) {
    const { selectedPaths } = context;
    console.log("[Plugin] Selected files:", selectedPaths);
    return { message: \`Logged \${selectedPaths.length} file(s) to the main process console.\` };
  },
};
`;

function getPluginsDir() {
  return path.join(app.getPath("userData"), "plugins");
}

async function ensurePluginsDir() {
  const dir = getPluginsDir();
  await fs.mkdir(dir, { recursive: true });
  const examplePath = path.join(dir, "example.js");
  try {
    await fs.access(examplePath);
  } catch {
    await fs.writeFile(examplePath, EXAMPLE_PLUGIN);
  }
  return dir;
}

async function loadPlugins(): Promise<LoadedPlugin[]> {
  const dir = await ensurePluginsDir();
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".js"));
  const plugins: LoadedPlugin[] = [];
  for (const file of files) {
    try {
      const fullPath = path.join(dir, file);
      delete require.cache[require.resolve(fullPath)];
      const mod = require(fullPath);
      if (mod && typeof mod.run === "function" && mod.id && mod.label) {
        plugins.push({ id: mod.id, label: mod.label, fileName: file, run: mod.run });
      }
    } catch (err) {
      console.error(`Failed to load plugin ${file}:`, err);
    }
  }
  return plugins;
}

export function registerPluginsIpc() {
  ipcMain.handle("plugins:list", async (): Promise<PluginInfo[]> => {
    const plugins = await loadPlugins();
    return plugins.map(({ id, label, fileName }) => ({ id, label, fileName }));
  });

  ipcMain.handle("plugins:run", async (_e, id: string, context: { selectedPaths: string[]; currentPath: string }) => {
    const plugins = await loadPlugins();
    const plugin = plugins.find((p) => p.id === id);
    if (!plugin) throw new Error("Plugin not found");
    return plugin.run(context);
  });

  ipcMain.handle("plugins:openFolder", async () => {
    const dir = await ensurePluginsDir();
    shell.openPath(dir);
    return dir;
  });
}
