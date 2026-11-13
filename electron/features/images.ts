import { ipcMain } from "electron";
import { Jimp } from "jimp";
import * as exifr from "exifr";
import * as path from "node:path";
import type { ExifData } from "../shared/types";

async function getExif(filePath: string): Promise<ExifData | null> {
  try {
    const data = await exifr.parse(filePath, { gps: true });
    if (!data) return null;
    return {
      make: data.Make,
      model: data.Model,
      dateTaken: data.DateTimeOriginal ? new Date(data.DateTimeOriginal).toISOString() : undefined,
      gpsLatitude: data.latitude,
      gpsLongitude: data.longitude,
      width: data.ExifImageWidth ?? data.ImageWidth,
      height: data.ExifImageHeight ?? data.ImageHeight,
      iso: data.ISO,
      fNumber: data.FNumber,
      exposureTime: data.ExposureTime,
      focalLength: data.FocalLength,
    };
  } catch {
    return null;
  }
}

function destFor(srcPath: string, destDir: string, suffix: string, ext?: string) {
  const base = path.basename(srcPath, path.extname(srcPath));
  const extension = ext ?? path.extname(srcPath).slice(1);
  return path.join(destDir, `${base}${suffix}.${extension}`);
}

async function resizeImage(srcPath: string, destDir: string, width: number, height?: number) {
  const image = await Jimp.read(srcPath);
  if (height !== undefined) image.resize({ w: width, h: height });
  else image.resize({ w: width });
  const dest = destFor(srcPath, destDir, `_${width}x${height ?? "auto"}`);
  await image.write(dest as `${string}.${string}`);
  return dest;
}

async function rotateImage(srcPath: string, destDir: string, degrees: number) {
  const image = await Jimp.read(srcPath);
  image.rotate(degrees);
  const dest = destFor(srcPath, destDir, `_rot${degrees}`);
  await image.write(dest as `${string}.${string}`);
  return dest;
}

async function convertImage(srcPath: string, destDir: string, format: "png" | "jpeg" | "webp" | "bmp") {
  const image = await Jimp.read(srcPath);
  const ext = format === "jpeg" ? "jpg" : format;
  const dest = destFor(srcPath, destDir, "", ext);
  await image.write(dest as `${string}.${string}`);
  return dest;
}

export function registerImagesIpc() {
  ipcMain.handle("image:getExif", (_e, filePath: string) => getExif(filePath));
  ipcMain.handle("image:resize", (_e, srcPath: string, destDir: string, width: number, height?: number) =>
    resizeImage(srcPath, destDir, width, height)
  );
  ipcMain.handle("image:rotate", (_e, srcPath: string, destDir: string, degrees: number) =>
    rotateImage(srcPath, destDir, degrees)
  );
  ipcMain.handle(
    "image:convert",
    (_e, srcPath: string, destDir: string, format: "png" | "jpeg" | "webp" | "bmp") =>
      convertImage(srcPath, destDir, format)
  );
  ipcMain.handle(
    "image:batch",
    async (_e, paths: string[], destDir: string, op: { kind: "resize" | "rotate" | "convert"; width?: number; height?: number; degrees?: number; format?: "png" | "jpeg" | "webp" | "bmp" }) => {
      const results: string[] = [];
      for (const p of paths) {
        if (op.kind === "resize" && op.width) results.push(await resizeImage(p, destDir, op.width, op.height));
        else if (op.kind === "rotate" && op.degrees !== undefined) results.push(await rotateImage(p, destDir, op.degrees));
        else if (op.kind === "convert" && op.format) results.push(await convertImage(p, destDir, op.format));
      }
      return results;
    }
  );
}
