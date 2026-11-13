import { app, ipcMain, shell } from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const DEFAULT_TEMPLATES: { name: string; content: string }[] = [
  { name: "Text File.txt", content: "" },
  { name: "Markdown.md", content: "# Title\n\n" },
  { name: "JSON.json", content: "{\n  \n}\n" },
];

function getTemplatesDir() {
  return path.join(app.getPath("userData"), "templates");
}

async function ensureTemplatesDir() {
  const dir = getTemplatesDir();
  await fs.mkdir(dir, { recursive: true });
  for (const tpl of DEFAULT_TEMPLATES) {
    const tplPath = path.join(dir, tpl.name);
    try {
      await fs.access(tplPath);
    } catch {
      await fs.writeFile(tplPath, tpl.content);
    }
  }
  return dir;
}

async function listTemplates(): Promise<{ name: string; path: string }[]> {
  const dir = await ensureTemplatesDir();
  const files = await fs.readdir(dir, { withFileTypes: true });
  return files.filter((f) => f.isFile()).map((f) => ({ name: f.name, path: path.join(dir, f.name) }));
}

function uniqueDestPath(destDir: string, baseName: string): string {
  return path.join(destDir, baseName);
}

async function createFromTemplate(templatePath: string, destDir: string): Promise<string> {
  const baseName = path.basename(templatePath);
  const dest = uniqueDestPath(destDir, baseName);
  await fs.copyFile(templatePath, dest);
  return dest;
}

export function registerTemplatesIpc() {
  ipcMain.handle("templates:list", () => listTemplates());
  ipcMain.handle("templates:createFrom", (_e, templatePath: string, destDir: string) =>
    createFromTemplate(templatePath, destDir)
  );
  ipcMain.handle("templates:openFolder", async () => {
    const dir = await ensureTemplatesDir();
    shell.openPath(dir);
    return dir;
  });
}
