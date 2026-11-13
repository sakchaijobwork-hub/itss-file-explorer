import { useEffect, useState } from "react";

const cache = new Map<string, string | "error">();
const inFlight = new Map<string, Promise<string>>();

function generate(path: string): Promise<string> {
  const existing = inFlight.get(path);
  if (existing) return existing;

  const promise = new Promise<string>((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.src = `file://${encodeURI(path)}`;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    });
    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 160;
        canvas.height = video.videoHeight || 90;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("video load error"));
    });
  });

  inFlight.set(path, promise);
  return promise;
}

export function useVideoThumbnail(path: string, enabled: boolean): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(() => {
    const cached = cache.get(path);
    return cached && cached !== "error" ? cached : null;
  });

  useEffect(() => {
    if (!enabled) return;
    const cached = cache.get(path);
    if (cached) {
      setDataUrl(cached === "error" ? null : cached);
      return;
    }
    let cancelled = false;
    generate(path)
      .then((url) => {
        cache.set(path, url);
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        cache.set(path, "error");
      })
      .finally(() => {
        inFlight.delete(path);
      });
    return () => {
      cancelled = true;
    };
  }, [path, enabled]);

  return dataUrl;
}
