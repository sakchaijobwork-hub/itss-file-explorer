import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import { loadSettings, saveSettings, type AppSettings } from "@/utils/settings";
import type { SortKey, ViewMode } from "@/types";

export function SettingsDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const setViewMode = useFileStore((s) => s.setViewMode);
  const setSort = useFileStore((s) => s.setSort);
  const showHidden = useFileStore((s) => s.showHidden);
  const toggleHidden = useFileStore((s) => s.toggleHidden);
  const setThemeMode = useFileStore((s) => s.setThemeMode);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function applyAndSave() {
    saveSettings(settings);
    setViewMode(settings.defaultViewMode);
    setSort(settings.defaultSortKey, settings.defaultSortDirection);
    if (settings.showHiddenByDefault !== showHidden) toggleHidden();
    setThemeMode(settings.themeMode);
    closeModal();
  }

  return (
    <Modal title="Settings" onClose={closeModal} width="400px">
      <div className="space-y-4 text-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Default View
          </label>
          <select
            value={settings.defaultViewMode}
            onChange={(e) => update("defaultViewMode", e.target.value as ViewMode)}
            className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
            <option value="details">Details</option>
            <option value="columns">Columns</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Default Sort
          </label>
          <div className="flex gap-2">
            <select
              value={settings.defaultSortKey}
              onChange={(e) => update("defaultSortKey", e.target.value as SortKey)}
              className="flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
            >
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="modifiedAt">Date Modified</option>
              <option value="type">Type</option>
            </select>
            <select
              value={settings.defaultSortDirection}
              onChange={(e) => update("defaultSortDirection", e.target.value as "asc" | "desc")}
              className="rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={settings.showHiddenByDefault}
            onChange={(e) => update("showHiddenByDefault", e.target.checked)}
          />
          Show hidden files by default
        </label>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={settings.confirmBeforeTrash}
            onChange={(e) => update("confirmBeforeTrash", e.target.checked)}
          />
          Ask before moving files to Trash
        </label>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Theme</label>
          <select
            value={settings.themeMode}
            onChange={(e) => update("themeMode", e.target.value as "light" | "dark" | "auto")}
            className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (follow system)</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={applyAndSave}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
