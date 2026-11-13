import { ipcMain } from "electron";
import { Client as FtpClient, FileInfo } from "basic-ftp";
import SftpClient from "ssh2-sftp-client";
import type { WebDAVClient, FileStat } from "webdav";
import * as crypto from "node:crypto";
import type { RemoteConnectionConfig, RemoteEntry } from "../shared/types";

type Connection =
  | { protocol: "ftp"; client: FtpClient }
  | { protocol: "sftp"; client: SftpClient }
  | { protocol: "webdav"; client: WebDAVClient };

const connections = new Map<string, Connection>();

function newId() {
  return crypto.randomBytes(8).toString("hex");
}

async function connect(config: RemoteConnectionConfig): Promise<string> {
  const id = newId();

  if (config.protocol === "ftp") {
    const client = new FtpClient();
    await client.access({
      host: config.host,
      port: config.port ?? 21,
      user: config.user,
      password: config.password,
      secure: config.secure ?? false,
    });
    connections.set(id, { protocol: "ftp", client });
  } else if (config.protocol === "sftp") {
    const client = new SftpClient();
    await client.connect({
      host: config.host,
      port: config.port ?? 22,
      username: config.user,
      password: config.password,
    });
    connections.set(id, { protocol: "sftp", client });
  } else {
    const { createClient } = await import("webdav");
    const client = createClient(config.url ?? `https://${config.host}`, {
      username: config.user,
      password: config.password,
    });
    connections.set(id, { protocol: "webdav", client });
  }

  return id;
}

async function listDir(id: string, dirPath: string): Promise<RemoteEntry[]> {
  const conn = connections.get(id);
  if (!conn) throw new Error("Not connected");

  if (conn.protocol === "ftp") {
    const list: FileInfo[] = await conn.client.list(dirPath);
    return list.map((f) => ({
      name: f.name,
      path: dirPath.replace(/\/$/, "") + "/" + f.name,
      isDirectory: f.isDirectory,
      size: f.size,
      modifiedAt: f.modifiedAt ? f.modifiedAt.getTime() : 0,
    }));
  }

  if (conn.protocol === "sftp") {
    const list = await conn.client.list(dirPath);
    return list.map((f) => ({
      name: f.name,
      path: dirPath.replace(/\/$/, "") + "/" + f.name,
      isDirectory: f.type === "d",
      size: f.size,
      modifiedAt: f.modifyTime,
    }));
  }

  const list = (await conn.client.getDirectoryContents(dirPath)) as FileStat[];
  return list.map((f) => ({
    name: f.basename,
    path: f.filename,
    isDirectory: f.type === "directory",
    size: f.size,
    modifiedAt: new Date(f.lastmod).getTime(),
  }));
}

async function download(id: string, remotePath: string, localPath: string) {
  const conn = connections.get(id);
  if (!conn) throw new Error("Not connected");
  if (conn.protocol === "ftp") await conn.client.downloadTo(localPath, remotePath);
  else if (conn.protocol === "sftp") await conn.client.fastGet(remotePath, localPath);
  else {
    const data = await conn.client.getFileContents(remotePath);
    await import("node:fs/promises").then((fs) => fs.writeFile(localPath, data as Buffer));
  }
}

async function upload(id: string, localPath: string, remotePath: string) {
  const conn = connections.get(id);
  if (!conn) throw new Error("Not connected");
  if (conn.protocol === "ftp") await conn.client.uploadFrom(localPath, remotePath);
  else if (conn.protocol === "sftp") await conn.client.fastPut(localPath, remotePath);
  else {
    const data = await import("node:fs/promises").then((fs) => fs.readFile(localPath));
    await conn.client.putFileContents(remotePath, data);
  }
}

async function mkdir(id: string, dirPath: string) {
  const conn = connections.get(id);
  if (!conn) throw new Error("Not connected");
  if (conn.protocol === "ftp") await conn.client.ensureDir(dirPath);
  else if (conn.protocol === "sftp") await conn.client.mkdir(dirPath, true);
  else await conn.client.createDirectory(dirPath);
}

async function remove(id: string, targetPath: string, isDirectory: boolean) {
  const conn = connections.get(id);
  if (!conn) throw new Error("Not connected");
  if (conn.protocol === "ftp") {
    if (isDirectory) await conn.client.removeDir(targetPath);
    else await conn.client.remove(targetPath);
  } else if (conn.protocol === "sftp") {
    if (isDirectory) await conn.client.rmdir(targetPath, true);
    else await conn.client.delete(targetPath);
  } else {
    await conn.client.deleteFile(targetPath);
  }
}

async function disconnect(id: string) {
  const conn = connections.get(id);
  if (!conn) return;
  if (conn.protocol === "ftp") conn.client.close();
  else if (conn.protocol === "sftp") await conn.client.end();
  connections.delete(id);
}

export function registerRemoteIpc() {
  ipcMain.handle("remote:connect", (_e, config: RemoteConnectionConfig) => connect(config));
  ipcMain.handle("remote:listDir", (_e, id: string, dirPath: string) => listDir(id, dirPath));
  ipcMain.handle("remote:download", (_e, id: string, remotePath: string, localPath: string) =>
    download(id, remotePath, localPath)
  );
  ipcMain.handle("remote:upload", (_e, id: string, localPath: string, remotePath: string) =>
    upload(id, localPath, remotePath)
  );
  ipcMain.handle("remote:mkdir", (_e, id: string, dirPath: string) => mkdir(id, dirPath));
  ipcMain.handle("remote:remove", (_e, id: string, targetPath: string, isDirectory: boolean) =>
    remove(id, targetPath, isDirectory)
  );
  ipcMain.handle("remote:disconnect", (_e, id: string) => disconnect(id));
}
