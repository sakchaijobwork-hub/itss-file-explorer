import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import type { AutomationRule } from "@/types";
import { Trash2 } from "lucide-react";

function newId() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AutomationDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [pattern, setPattern] = useState("*.pdf");
  const [action, setAction] = useState<"move" | "tag" | "rename">("move");
  const [destDir, setDestDir] = useState("");
  const [tag, setTag] = useState("blue");
  const [renamePattern, setRenamePattern] = useState("{name}_archived.{ext}");

  useEffect(() => {
    window.fileAPI.listAutomationRules().then(setRules);
  }, []);

  async function addRule() {
    if (!activeTab) return;
    const rule: AutomationRule = {
      id: newId(),
      watchDir: activeTab.path,
      pattern,
      action,
      destDir: action === "move" ? destDir : undefined,
      tag: action === "tag" ? tag : undefined,
      renamePattern: action === "rename" ? renamePattern : undefined,
      enabled: true,
    };
    const next = await window.fileAPI.addAutomationRule(rule);
    setRules(next);
  }

  async function removeRule(id: string) {
    const next = await window.fileAPI.removeAutomationRule(id);
    setRules(next);
  }

  async function toggleRule(id: string) {
    const next = await window.fileAPI.toggleAutomationRule(id);
    setRules(next);
  }

  async function pickDest() {
    const dir = await window.fileAPI.openDirectoryDialog(activeTab?.path);
    if (dir) setDestDir(dir);
  }

  return (
    <Modal title="Folder Automation Rules" onClose={closeModal} width="520px">
      <div className="space-y-3 text-sm">
        <div className="text-xs text-gray-400">
          New rule watches: <span className="font-mono">{activeTab?.path}</span>
        </div>

        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Filename pattern e.g. *.pdf"
          className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
        />

        <div className="flex gap-2">
          {(["move", "tag", "rename"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`rounded-md px-3 py-1 text-xs capitalize ${action === a ? "bg-accent text-white" : "bg-black/5 dark:bg-white/10"}`}
            >
              {a}
            </button>
          ))}
        </div>

        {action === "move" && (
          <div className="flex gap-2">
            <input
              value={destDir}
              onChange={(e) => setDestDir(e.target.value)}
              placeholder="Destination folder"
              className="flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
            />
            <button onClick={pickDest} className="rounded-md bg-black/5 px-3 py-1.5 text-xs hover:bg-black/10 dark:bg-white/10">
              Browse…
            </button>
          </div>
        )}
        {action === "tag" && (
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
          >
            {["red", "orange", "yellow", "green", "blue", "purple", "gray"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        {action === "rename" && (
          <input
            value={renamePattern}
            onChange={(e) => setRenamePattern(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10"
          />
        )}

        <div className="flex justify-end">
          <button onClick={addRule} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover">
            Add Rule
          </button>
        </div>

        <div className="space-y-1 border-t border-black/10 pt-3 dark:border-white/10">
          <div className="text-xs font-semibold text-gray-400">Existing rules</div>
          {rules.length === 0 && <div className="py-4 text-center text-xs text-gray-400">No rules yet</div>}
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-md bg-black/5 px-2 py-1.5 text-xs dark:bg-white/5">
              <input type="checkbox" checked={r.enabled} onChange={() => toggleRule(r.id)} />
              <span className="flex-1 truncate">
                {r.watchDir} · <span className="font-mono">{r.pattern}</span> → {r.action}
              </span>
              <button onClick={() => removeRule(r.id)} className="rounded p-1 text-red-500 hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
