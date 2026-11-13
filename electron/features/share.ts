import { ipcMain } from "electron";
import * as http from "node:http";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import QRCode from "qrcode";
import type { ShareInfo } from "../shared/types";

let server: http.Server | null = null;
let servedPaths: Map<string, string> = new Map();
let token = "";

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".pdf": "application/pdf", ".txt": "text/plain", ".mp4": "video/mp4",
    ".zip": "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
}

async function startShare(paths: string[]): Promise<ShareInfo> {
  if (server) {
    server.close();
    server = null;
  }
  token = crypto.randomBytes(6).toString("hex");
  servedPaths = new Map();
  for (const p of paths) {
    servedPaths.set(encodeURIComponent(path.basename(p)), p);
  }

  server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith(`/${token}`)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const rest = url.pathname.slice(`/${token}`.length);

    if (rest === "" || rest === "/") {
      const items = Array.from(servedPaths.entries());
      const list = items
        .map(([name]) => `<li><a href="/${token}/file/${name}">${decodeURIComponent(name)}</a></li>`)
        .join("");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<html><body><h2>Shared files</h2><ul>${list}</ul></body></html>`);
      return;
    }

    const match = rest.match(/^\/file\/(.+)$/);
    if (match) {
      const name = match[1];
      const filePath = servedPaths.get(name);
      if (!filePath) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      try {
        const stat = await fsp.stat(filePath);
        res.writeHead(200, {
          "Content-Type": contentTypeFor(filePath),
          "Content-Length": stat.size,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(path.basename(filePath))}"`,
        });
        fs.createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  await new Promise<void>((resolve) => server!.listen(0, "0.0.0.0", resolve));
  const port = (server.address() as { port: number }).port;
  const url = `http://${getLocalIp()}:${port}/${token}`;
  const qrDataUrl = await QRCode.toDataURL(url);
  return { url, qrDataUrl, paths };
}

function stopShare() {
  if (server) {
    server.close();
    server = null;
  }
  servedPaths = new Map();
}

export function registerShareIpc() {
  ipcMain.handle("share:start", (_e, paths: string[]) => startShare(paths));
  ipcMain.handle("share:stop", () => stopShare());
}
