import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, HardDrive, Home, Star, Plus, X, Trash2, MonitorSmartphone, RefreshCw } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import type { ParallelsVm, QuickAccessItem } from "@/types";
import { formatBytes } from "@/utils/format";
import { getDraggingPaths, clearDraggingPaths } from "@/utils/dragState";
import clsx from "clsx";

function SidebarItem({
  label,
  path,
  icon: Icon,
  iconFill,
  onRemove,
}: {
  label: string;
  path: string;
  icon: typeof Home;
  iconFill?: string;
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
        <Icon className="h-4 w-4 shrink-0" fill={iconFill} />
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

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 224; // matches the previous fixed w-56

function loadSidebarWidth(): number {
  const raw = Number(localStorage.getItem("itss-sidebar-width"));
  return raw >= MIN_SIDEBAR_WIDTH && raw <= MAX_SIDEBAR_WIDTH ? raw : DEFAULT_SIDEBAR_WIDTH;
}

export function Sidebar() {
  const [sidebarWidth, setSidebarWidthState] = useState(loadSidebarWidth);
  const sidebarWidthRef = useRef(sidebarWidth);
  const resizing = useRef(false);
  function setSidebarWidth(w: number) {
    sidebarWidthRef.current = w;
    setSidebarWidthState(w);
  }
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([]);
  const [drives, setDrives] = useState<QuickAccessItem[]>([]);
  const [home, setHome] = useState<string>("");
  const [favDragOver, setFavDragOver] = useState(false);
  const [draggingFavPath, setDraggingFavPath] = useState<string | null>(null);
  const [dragOverFavPath, setDragOverFavPath] = useState<string | null>(null);
  const favorites = useUiStore((s) => s.favorites);
  const loadFavorites = useUiStore((s) => s.loadFavorites);
  const addFavorite = useUiStore((s) => s.addFavorite);
  const removeFavorite = useUiStore((s) => s.removeFavorite);
  const reorderFavorites = useUiStore((s) => s.reorderFavorites);
  const openModal = useUiStore((s) => s.openModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

  useEffect(() => {
    window.fileAPI.getHome().then(setHome);
    window.fileAPI.getQuickAccess().then(setQuickAccess);
    window.fileAPI.getDrives().then(setDrives);
    loadFavorites();
  }, [loadFavorites]);

  async function addCurrentFolder() {
    if (!activeTab) return;
    await addFavorite(activeTab.path);
  }

  async function handleFavoritesDrop(e: React.DragEvent) {
    e.preventDefault();
    setFavDragOver(false);
    // Rows in FileList are dragged out via Electron's native OS-level
    // drag (for dropping onto Finder/other apps), not a normal browser
    // drag, so dataTransfer.files is never populated for that case —
    // read the paths tracked out-of-band instead. A drag that truly
    // comes from outside the app (e.g. dragging a folder in from
    // Finder) still arrives via dataTransfer.files as usual.
    const tracked = getDraggingPaths();
    const paths = tracked.length > 0 ? tracked : Array.from(e.dataTransfer.files).map((f) => window.fileAPI.getPathForFile(f));
    for (const p of paths) {
      const info = await window.fileAPI.getInfo(p);
      if (info?.isDirectory && !favorites.some((fav) => fav.path === p)) {
        await addFavorite(p);
      }
    }
    clearDraggingPaths();
  }

  function reorderFavoriteTo(targetPath: string) {
    if (!draggingFavPath || draggingFavPath === targetPath) return;
    const order = favorites.map((f) => f.path);
    const fromIdx = order.indexOf(draggingFavPath);
    const toIdx = order.indexOf(targetPath);
    if (fromIdx === -1 || toIdx === -1) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, draggingFavPath);
    reorderFavorites(order);
  }

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(ev: MouseEvent) {
      const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + (ev.clientX - startX)));
      setSidebarWidth(next);
    }
    function onMouseUp() {
      resizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      localStorage.setItem("itss-sidebar-width", String(sidebarWidthRef.current));
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
    <aside
      style={{ width: sidebarWidth }}
      className="flex shrink-0 flex-col gap-4 overflow-y-auto bg-panel-light px-2 py-3 dark:bg-panel-dark">
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

      <div
        onDragOver={(e) => {
          // An in-app native OS drag (see handleFavoritesDrop) doesn't
          // necessarily report "Files" in dataTransfer.types, so this
          // stays permissive rather than gating on that; dropping
          // anything that isn't actually a folder path is a no-op.
          e.preventDefault();
          setFavDragOver(true);
        }}
        onDragLeave={() => setFavDragOver(false)}
        onDrop={handleFavoritesDrop}
        className={clsx("rounded-md transition-colors", favDragOver && "bg-accent/10 ring-1 ring-accent/40")}
      >
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">My Favorites</span>
          <button onClick={addCurrentFolder} title="Add current folder" className="rounded p-0.5 text-gray-400 hover:bg-black/5 dark:hover:bg-white/10">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {favorites.length === 0 && (
            <div className="px-2 py-1 text-[11px] text-gray-400">
              {favDragOver ? "Drop to pin this folder" : "Click + or drag a folder here"}
            </div>
          )}
          {favorites.map((fav) => (
            <div
              key={fav.path}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.effectAllowed = "move";
                setDraggingFavPath(fav.path);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggingFavPath) setDragOverFavPath(fav.path);
              }}
              onDragLeave={() => setDragOverFavPath((p) => (p === fav.path ? null : p))}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                reorderFavoriteTo(fav.path);
                setDraggingFavPath(null);
                setDragOverFavPath(null);
              }}
              onDragEnd={() => {
                setDraggingFavPath(null);
                setDragOverFavPath(null);
              }}
              className={clsx(
                "rounded-md border-t-2",
                dragOverFavPath === fav.path && draggingFavPath && draggingFavPath !== fav.path
                  ? "border-accent"
                  : "border-transparent",
                draggingFavPath === fav.path && "opacity-40"
              )}
            >
              <SidebarItem label={fav.name} path={fav.path} icon={Star} iconFill="#eab308" onRemove={() => removeFavorite(fav.path)} />
            </div>
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

      <ParallelsVmsSection />

      <DiskSpaceIndicator path={activeTab?.path} />
    </aside>
    <div
      onMouseDown={startResize}
      className="group relative w-1 shrink-0 cursor-col-resize"
      title="Drag to resize"
    >
      <div className="absolute inset-y-0 left-0 w-px bg-black/5 group-hover:bg-accent/60 dark:bg-white/5" />
    </div>
    </>
  );
}

function ParallelsVmsSection() {
  const [vms, setVms] = useState<ParallelsVm[]>([]);
  const [available, setAvailable] = useState(false);
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const navigateTo = useFileStore((s) => s.navigateTo);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));

  function refresh() {
    window.fileAPI.listParallelsVms().then(setVms);
  }

  useEffect(() => {
    if (window.fileAPI.platform !== "darwin") return;
    window.fileAPI.isParallelsAvailable().then((ok) => {
      setAvailable(ok);
      if (ok) refresh();
    });
  }, []);

  if (!available || vms.length === 0) return null;

  async function reconnect(name: string) {
    setReconnecting(name);
    try {
      await window.fileAPI.reconnectParallelsVm(name);
    } finally {
      setTimeout(() => {
        refresh();
        setReconnecting(null);
      }, 1500);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Parallels VMs</span>
        <button onClick={refresh} title="Refresh" className="rounded p-0.5 text-gray-400 hover:bg-black/5 dark:hover:bg-white/10">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        {vms.map((vm) => {
          const isActive = !!vm.mountedPath && activeTab?.path === vm.mountedPath;
          return (
            <div
              key={vm.uuid}
              className={clsx(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]",
                isActive ? "bg-accent/15 text-accent" : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
              )}
            >
              <button
                onClick={() => vm.accessible && vm.mountedPath && navigateTo(vm.mountedPath)}
                disabled={!vm.accessible}
                title={vm.accessible ? vm.mountedPath! : `${vm.name} drive isn't mounted on macOS yet`}
                className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
              >
                <MonitorSmartphone className="h-4 w-4 shrink-0" />
                <span className="truncate">{vm.name}</span>
                <span
                  className={clsx(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    vm.accessible ? "bg-green-500" : vm.status === "running" ? "bg-yellow-500" : "bg-gray-400"
                  )}
                />
              </button>
              {!vm.accessible && vm.status === "running" && (
                <button
                  onClick={() => reconnect(vm.name)}
                  disabled={reconnecting === vm.name}
                  title="Connect via Finder (smb://)"
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-accent hover:bg-accent/10 disabled:opacity-40"
                >
                  {reconnecting === vm.name ? "…" : "Connect"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
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
