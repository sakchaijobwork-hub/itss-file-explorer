import { useEffect, useRef } from "react";
import { useFileStore } from "@/store/useFileStore";

export function useDirectoryLoader() {
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const setEntries = useFileStore((s) => s.setEntries);
  const setLoading = useFileStore((s) => s.setLoading);
  const setError = useFileStore((s) => s.setError);
  const watchedPath = useRef<string | null>(null);

  const path = activeTab?.path;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await window.fileAPI.readDir(path!);
        if (!cancelled) setEntries(result.entries);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to read directory");
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    if (watchedPath.current && watchedPath.current !== path) {
      window.fileAPI.unwatch(watchedPath.current);
    }
    window.fileAPI.watch(path);
    watchedPath.current = path;

    const unsubscribe = window.fileAPI.onChanged((changedPath) => {
      if (changedPath === path) load();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [path]);

  useEffect(() => {
    return () => {
      if (watchedPath.current) window.fileAPI.unwatch(watchedPath.current);
    };
  }, []);
}
