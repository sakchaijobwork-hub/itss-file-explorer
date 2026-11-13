import { useEffect, useState } from "react";
import { Clock, HardDrive, Home, Star } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import type { QuickAccessItem } from "@/types";
import clsx from "clsx";

function SidebarItem({ label, path, icon: Icon }: { label: string; path: string; icon: typeof Home }) {
  const navigateTo = useFileStore((s) => s.navigateTo);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const isActive = activeTab?.path === path;

  return (
    <button
      onClick={() => navigateTo(path)}
      title={path}
      className={clsx(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        isActive
          ? "bg-accent/15 text-accent"
          : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function Sidebar() {
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([]);
  const [drives, setDrives] = useState<QuickAccessItem[]>([]);
  const [home, setHome] = useState<string>("");
  const openModal = useUiStore((s) => s.openModal);

  useEffect(() => {
    window.fileAPI.getHome().then(setHome);
    window.fileAPI.getQuickAccess().then(setQuickAccess);
    window.fileAPI.getDrives().then(setDrives);
  }, []);

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
    </aside>
  );
}
