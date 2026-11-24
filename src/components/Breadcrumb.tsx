import { useEffect, useRef, useState } from "react";
import { ChevronRight, GitBranch, Pencil } from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { useUiStore } from "@/store/useUiStore";
import { splitPathSegments } from "@/utils/format";
import type { GitStatusResult } from "@/types";

export function Breadcrumb() {
  const activeTab = useFileStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const navigateTo = useFileStore((s) => s.navigateTo);
  const [git, setGit] = useState<GitStatusResult | null>(null);
  const editing = useUiStore((s) => s.addressBarEditing);
  const setEditing = useUiStore((s) => s.setAddressBarEditing);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeTab) return;
    let cancelled = false;
    window.fileAPI.getGitStatus(activeTab.path).then((res) => {
      if (!cancelled) setGit(res);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab?.path]);

  useEffect(() => {
    if (editing && activeTab) {
      setInputValue(activeTab.path);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing, activeTab?.path]);

  if (!activeTab) return null;

  if (editing) {
    return (
      <div className="no-drag flex h-8 items-center border-b border-black/5 bg-surface-light px-3 dark:border-white/5 dark:bg-surface-dark">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              navigateTo(inputValue.trim());
              setEditing(false);
            } else if (e.key === "Escape") {
              setEditing(false);
            }
          }}
          className="w-full rounded border border-accent bg-transparent px-1.5 py-0.5 font-mono text-xs outline-none"
        />
      </div>
    );
  }

  const segments = splitPathSegments(activeTab.path);

  async function copyPath(path: string) {
    const action = await window.fileAPI.showContextMenu([{ id: "copyPath", label: "Copy Path" }]);
    if (action === "copyPath") await navigator.clipboard.writeText(path);
  }

  return (
    <div
      className="no-drag group flex h-8 items-center gap-0.5 overflow-x-auto border-b border-black/5 bg-surface-light px-3 text-xs text-gray-600 dark:border-white/5 dark:bg-surface-dark dark:text-gray-300"
      onDoubleClick={() => setEditing(true)}
      onContextMenu={(e) => {
        e.preventDefault();
        copyPath(activeTab.path);
      }}
    >
      {segments.map((seg, i) => (
        <div key={seg.path} className="flex shrink-0 items-center gap-0.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
          <button
            onClick={() => navigateTo(seg.path)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              copyPath(seg.path);
            }}
            className="rounded px-1.5 py-0.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {seg.label}
          </button>
        </div>
      ))}
      <button
        onClick={() => setEditing(true)}
        title="Type a path (⌘L)"
        className="ml-1 shrink-0 rounded p-1 opacity-0 hover:bg-black/5 group-hover:opacity-100 dark:hover:bg-white/10"
      >
        <Pencil className="h-3 w-3" />
      </button>
      {git?.isRepo && git.branch && (
        <div className="ml-2 flex shrink-0 items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-white/10 dark:text-gray-400">
          <GitBranch className="h-3 w-3" />
          {git.branch}
          {git.files.length > 0 && <span className="text-accent">· {git.files.length}</span>}
        </div>
      )}
    </div>
  );
}
