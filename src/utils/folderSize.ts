const cache = new Map<string, { size: number; capped: boolean }>();
const pending = new Map<string, Promise<{ size: number; capped: boolean }>>();
const queue: (() => void)[] = [];
const MAX_CONCURRENT = 3;
let active = 0;

function runNext() {
  if (active >= MAX_CONCURRENT) return;
  const next = queue.shift();
  if (next) next();
}

export function getFolderSize(dirPath: string): Promise<{ size: number; capped: boolean }> {
  const cached = cache.get(dirPath);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(dirPath);
  if (existing) return existing;

  const promise = new Promise<{ size: number; capped: boolean }>((resolve) => {
    queue.push(async () => {
      active++;
      try {
        const result = await window.fileAPI.getFolderSizeQuick(dirPath);
        cache.set(dirPath, result);
        resolve(result);
      } finally {
        active--;
        pending.delete(dirPath);
        runNext();
      }
    });
    runNext();
  });
  pending.set(dirPath, promise);
  return promise;
}
