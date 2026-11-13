import { useEffect, useState } from "react";
import { Clock, HardDrive, Home, Star, Plus, X, Trash2 } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import type { FavoriteEntry, QuickAccessItem } from "@/types";
import { formatBytes } from "@/utils/format";
import clsx from "clsx";

function SidebarItem({
  label,
  path,
  icon: Icon,
  onRemove,
}: {
  label: string;
  path: string;
  icon: typeof Home;
  onRemove?: () => void;
}) {
  const navigateTo = useFileStore((s) => s.navigateTo);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const isActive = activeTab?.path === path;

  return (
    <div
      className={clsx(
        "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        isActive
          ? "bg-accent/15 text-accent"
          : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
      )}
    >
      <button onClick={() => navigateTo(path)} title={path} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 rounded p-0.5 opacity-0 hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function Sidebar() {
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([]);
  const [drives, setDrives] = useState<QuickAccessItem[]>([]);
  const [home, setHome] = useState<string>("");
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const openModal = useUiStore((s) => s.openModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

  useEffect(() => {
    window.fileAPI.getHome().then(setHome);
    window.fileAPI.getQuickAccess().then(setQuickAccess);
    window.fileAPI.getDrives().then(setDrives);
    window.fileAPI.listFavorites().then(setFavorites);
  }, []);

  async function addCurrentFolder() {
    if (!activeTab) return;
    setFavorites(await window.fileAPI.addFavorite(activeTab.path));
  }

  async function removeFavorite(path: string) {
    setFavorites(await window.fileAPI.removeFavorite(path));
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-black/5 bg-panel-light px-2 py-3 dark:border-white/5 dark:bg-panel-dark">
      <div>
        <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Favorites
        </div>
        <div className="flex flex-col gap-0.5">
          <SidebarItem label="Home" path={home} icon={Home} />
          {quickAccess.map((item) => (
            <SidebarItem key={item.path} label={item.name} path={item.path} icon={Star} />
          ))}
          <button
            onClick={() => openModal("recents")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span className="truncate">Recents</span>
          </button>
          <button
            onClick={() => openModal("trash")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Trash</span>
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">My Favorites</span>
          <button onClick={addCurrentFolder} title="Add current folder" className="rounded p-0.5 text-gray-400 hover:bg-black/5 dark:hover:bg-white/10">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {favorites.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-gray-400">Click + to pin a folder</div>
          )}
          {favorites.map((fav) => (
            <SidebarItem key={fav.path} label={fav.name} path={fav.path} icon={Star} onRemove={() => removeFavorite(fav.path)} />
          ))}
        </div>
      </div>

      <div>
        <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Locations
        </div>
        <div className="flex flex-col gap-0.5">
          {drives.map((drive) => (
            <SidebarItem key={drive.path} label={drive.name} path={drive.path} icon={HardDrive} />
          ))}
        </div>
      </div>

      <DiskSpaceIndicator path={activeTab?.path} />
    </aside>
  );
}

function DiskSpaceIndicator({ path }: { path?: string }) {
  const [space, setSpace] = useState<{ total: number; free: number; used: number } | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    window.fileAPI
      .getDiskSpace(path)
      .then((s) => {
        if (!cancelled) setSpace(s);
      })
      .catch(() => setSpace(null));
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!space || space.total === 0) return null;
  const usedPct = Math.min(100, Math.round((space.used / space.total) * 100));

  return (
    <div className="mt-auto px-2 pb-1 text-[11px] text-gray-400">
      <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div className="h-full bg-accent" style={{ width: `${usedPct}%` }} />
      </div>
      {formatBytes(space.free)} free of {formatBytes(space.total)}
    </div>
  );
}
