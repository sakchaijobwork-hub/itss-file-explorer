import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";

const isMac = navigator.platform.toLowerCase().includes("mac");
const mod = isMac ? "⌘" : "Ctrl";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "General",
    items: [
      [`${mod}K`, "Command Palette"],
      [`${mod}N`, "New Window"],
      [`${mod}⇧N`, "New Folder"],
      [`${mod}T`, "New Tab"],
      [`${mod}L`, "Edit Address Bar"],
      [`${mod}⇧F`, "Search File Contents"],
      ["Space", "Quick Look"],
    ],
  },
  {
    title: "File Operations",
    items: [
      [`${mod}C`, "Copy"],
      [`${mod}X`, "Cut"],
      [`${mod}V`, "Paste"],
      [`${mod}A`, "Select All"],
      ["Enter", "Rename"],
      ["Delete", "Move to Trash"],
      ["Type letters", "Jump to file by name"],
    ],
  },
  {
    title: "Navigation",
    items: [
      [`${mod}[`, "Back"],
      [`${mod}]`, "Forward"],
      [`${mod}↑`, "Up a folder"],
    ],
  },
];

export function ShortcutsDialog() {
  const closeModal = useUiStore((s) => s.closeModal);

  return (
    <Modal title="Keyboard Shortcuts" onClose={closeModal} width="420px">
      <div className="space-y-4 text-sm">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.title}</div>
            <div className="space-y-1">
              {group.items.map(([keys, label]) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-300">{label}</span>
                  <kbd className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/10">{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
