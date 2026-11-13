import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import { useFileStore } from "@/store/useFileStore";
import type { PluginInfo } from "@/types";
import { Play, FolderOpen } from "lucide-react";

export function PluginsDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const selectedPaths = useFileStore((s) => s.selectedPaths);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [output, setOutput] = useState<string | null>(null);

  useEffect(() => {
    window.fileAPI.listPlugins().then(setPlugins);
  }, []);

  async function run(id: string) {
    const result = await window.fileAPI.runPlugin(id, {
      selectedPaths: Array.from(selectedPaths),
      currentPath: activeTab?.path ?? "",
    });
    setOutput(JSON.stringify(result, null, 2));
  }

  return (
    <Modal title="Plugins" onClose={closeModal} width="440px">
      <div className="space-y-3 text-sm">
        <p className="text-[11px] text-gray-400">
          Drop a <code>.js</code> file exporting <code>{"{ id, label, run(context) }"}</code> into the plugins folder
          to extend the app. Plugins run with full system access in the main process.
        </p>
        <button
          onClick={() => window.fileAPI.openPluginsFolder()}
          className="flex items-center gap-1.5 rounded-md bg-black/5 px-3 py-1.5 text-xs hover:bg-black/10 dark:bg-white/10"
        >
          <FolderOpen className="h-3.5 w-3.5" /> Open Plugins Folder
        </button>

        <div className="space-y-1">
          {plugins.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md bg-black/5 px-2 py-1.5 text-xs dark:bg-white/5">
              <span>{p.label}</span>
              <button onClick={() => run(p.id)} className="flex items-center gap-1 rounded bg-accent px-2 py-1 text-white">
                <Play className="h-3 w-3" /> Run
              </button>
            </div>
          ))}
          {plugins.length === 0 && <div className="py-4 text-center text-xs text-gray-400">No plugins found</div>}
        </div>

        {output && (
          <pre className="max-h-32 overflow-auto rounded-md bg-black/5 p-2 text-[10px] text-gray-600 dark:bg-white/5 dark:text-gray-300">
            {output}
          </pre>
        )}
      </div>
    </Modal>
  );
}
