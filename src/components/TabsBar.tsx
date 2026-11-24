import { Plus, X } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { basename } from "@/utils/format";
import { TAG_COLORS, type TagColor } from "@/types";
import clsx from "clsx";

const TAG_HEX: Record<TagColor, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  gray: "#9ca3af",
};

export function TabsBar() {
  const tabs = useFileStore((s) => s.tabs);
  const activeTabId = useFileStore((s) => s.activeTabId);
  const setActiveTab = useFileStore((s) => s.setActiveTab);
  const closeTab = useFileStore((s) => s.closeTab);
  const openTab = useFileStore((s) => s.openTab);
  const setTabColor = useFileStore((s) => s.setTabColor);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const isMac = window.fileAPI.platform === "darwin";

  async function showColorMenu(tabId: string, current: TagColor | undefined) {
    const action = await window.fileAPI.showContextMenu([
      { id: "color:none", label: "None", checked: !current },
      ...TAG_COLORS.map((c) => ({
        id: `color:${c}`,
        label: c[0].toUpperCase() + c.slice(1),
        checked: current === c,
      })),
    ]);
    if (!action) return;
    const color = action === "color:none" ? undefined : (action.slice(6) as TagColor);
    setTabColor(tabId, color);
  }

  return (
    <div
      className={clsx(
        "drag flex h-9 items-center gap-1 bg-panel-light pt-1 dark:bg-panel-dark",
        isMac ? "pl-20 pr-2" : "px-2"
      )}
    >
      <div className="no-drag flex flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              showColorMenu(tab.id, tab.color);
            }}
            className={clsx(
              "group flex h-7 min-w-[120px] max-w-[180px] items-center gap-1.5 rounded-t-md px-3 text-xs transition-colors",
              tab.id === activeTabId
                ? "bg-surface-light text-gray-900 dark:bg-surface-dark dark:text-gray-100"
                : "text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
            )}
          >
            {tab.color && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TAG_HEX[tab.color] }} />
            )}
            <span className="flex-1 truncate text-left">{basename(tab.path) || tab.path}</span>
            {tabs.length > 1 && (
              <X
                className="h-3 w-3 shrink-0 opacity-0 hover:text-red-500 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              />
            )}
          </button>
        ))}
        <button
          onClick={() => activeTab && openTab(activeTab.path)}
          title="New Tab"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
