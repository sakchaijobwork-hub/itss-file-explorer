import { ipcMain } from "electron";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as crypto from "node:crypto";
import type { PermissionsInfo } from "../shared/types";

const ALGO = "aes-256-gcm";
const MAGIC = Buffer.from("ITSSENC1");

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, 32);
}

async function encryptFile(filePath: string, password: string): Promise<string> {
  const data = await fs.readFile(filePath);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const out = Buffer.concat([MAGIC, salt, iv, authTag, encrypted]);
  const destPath = `${filePath}.enc`;
  await fs.writeFile(destPath, out);
  return destPath;
}

async function decryptFile(filePath: string, password: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  const magic = buf.subarray(0, 8);
  if (!magic.equals(MAGIC)) throw new Error("Not a valid encrypted file");
  const salt = buf.subarray(8, 24);
  const iv = buf.subarray(24, 36);
  const authTag = buf.subarray(36, 52);
  const encrypted = buf.subarray(52);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const destPath = filePath.endsWith(".enc") ? filePath.slice(0, -4) : `${filePath}.dec`;
  await fs.writeFile(destPath, decrypted);
  return destPath;
}

async function shredFile(filePath: string, passes = 2) {
  const stat = await fs.stat(filePath);
  const fd = await fs.open(filePath, "r+");
  try {
    for (let i = 0; i < passes; i++) {
      const buf = crypto.randomBytes(Math.min(stat.size, 1024 * 1024));
      let written = 0;
      while (written < stat.size) {
        const chunk = buf.subarray(0, Math.min(buf.length, stat.size - written));
        await fd.write(chunk, 0, chunk.length, written);
        written += chunk.length;
      }
    }
  } finally {
    await fd.close();
  }
  await fs.unlink(filePath);
}

function modeToPermissions(path: string, mode: string): Omit<PermissionsInfo, "path"> {
  const octal = (parseInt(mode, 8) & 0o777).toString(8).padStart(3, "0");
  return {
    mode,
    octal,
    readable: fsSync.constants.R_OK !== undefined,
    writable: true,
    executable: /[1357]/.test(octal[2]),
  };
}

export function registerSecurityIpc() {
  ipcMain.handle("security:encrypt", async (_e, filePath: string, password: string) =>
    encryptFile(filePath, password)
  );
  ipcMain.handle("security:decrypt", async (_e, filePath: string, password: string) =>
    decryptFile(filePath, password)
  );
  ipcMain.handle("security:shred", async (_e, paths: string[]) => {
    for (const p of paths) {
      const stat = await fs.stat(p);
      if (stat.isDirectory()) {
        await fs.rm(p, { recursive: true, force: true });
      } else {
        await shredFile(p);
      }
    }
  });

  ipcMain.handle("fs:getPermissions", async (_e, targetPath: string): Promise<PermissionsInfo> => {
    const stat = await fs.stat(targetPath);
    const modeStr = (stat.mode & 0o777).toString(8).padStart(3, "0");
    return { path: targetPath, ...modeToPermissions(targetPath, modeStr) };
  });

  ipcMain.handle("fs:setPermissions", async (_e, targetPath: string, octal: string) => {
    await fs.chmod(targetPath, parseInt(octal, 8));
    const stat = await fs.stat(targetPath);
    const modeStr = (stat.mode & 0o777).toString(8).padStart(3, "0");
    return { path: targetPath, ...modeToPermissions(targetPath, modeStr) };
  });
}
