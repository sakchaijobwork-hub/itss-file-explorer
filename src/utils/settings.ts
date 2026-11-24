import type { SortDirection, SortKey, ViewMode } from "@/types";

export interface AppSettings {
  defaultViewMode: ViewMode;
  defaultSortKey: SortKey;
  defaultSortDirection: SortDirection;
  showHiddenByDefault: boolean;
  confirmBeforeTrash: boolean;
  themeMode: "light" | "dark" | "auto";
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultViewMode: "details",
  defaultSortKey: "name",
  defaultSortDirection: "asc",
  showHiddenByDefault: false,
  confirmBeforeTrash: true,
  themeMode: "dark",
};

const KEY = "itss-settings";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable — settings won't persist across restarts
  }
}
