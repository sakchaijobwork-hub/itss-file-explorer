import { Plus, X } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { basename } from "@/utils/format";
import { TAG_COLORS, type TagColor } from "@/types";
import { TAG_HEX } from "@/utils/tagColors";
import clsx from "clsx";

// Native OS menus can't render arbitrary colored icons for plain-text
// MenuItems without a lot of extra plumbing, but colored circle emoji
// render natively in full color in both the macOS and Windows menu
// fonts, giving a quick color-swatch preview with no extra work.
const TAG_SWATCH: Record<TagColor, string> = {
  red: "🔴",
  orange: "🟠",
  yellow: "🟡",
  green: "🟢",
  blue: "🔵",
  purple: "🟣",
  gray: "⚪",
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

  async function showTabMenu(tabId: string, path: string, current: TagColor | undefined) {
    const action = await window.fileAPI.showContextMenu([
      { id: "duplicateTab", label: "Duplicate Tab" },
      { type: "separator", id: "sep1", label: "" },
      {
        id: "color",
        label: "Color",
        submenu: [
          { id: "color:none", label: "None", checked: !current },
          ...TAG_COLORS.map((c) => ({
            id: `color:${c}`,
            label: `${TAG_SWATCH[c]}  ${c[0].toUpperCase() + c.slice(1)}`,
            checked: current === c,
          })),
        ],
      },
    ]);
    if (!action) return;
    if (action === "duplicateTab") {
      openTab(path);
      return;
    }
    if (action.startsWith("color:")) {
      const color = action === "color:none" ? undefined : (action.slice(6) as TagColor);
      setTabColor(tabId, color);
    }
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
              showTabMenu(tab.id, tab.path, tab.color);
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
