import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useUiStore } from "@/store/useUiStore";
import type { PermissionsInfo } from "@/types";

const CLASSES = ["owner", "group", "others"] as const;
const BITS = [
  { label: "Read", value: 4 },
  { label: "Write", value: 2 },
  { label: "Exec", value: 1 },
];

export function PermissionsDialog() {
  const closeModal = useUiStore((s) => s.closeModal);
  const targetPaths = useUiStore((s) => s.modalTargetPaths);
  const targetPath = targetPaths[0];
  const [info, setInfo] = useState<PermissionsInfo | null>(null);
  const [digits, setDigits] = useState<[number, number, number]>([7, 5, 5]);

  useEffect(() => {
    if (!targetPath) return;
    window.fileAPI.getPermissions(targetPath).then((p) => {
      setInfo(p);
      const [a, b, c] = p.octal.split("").map(Number);
      setDigits([a, b, c]);
    });
  }, [targetPath]);

  function hasBit(classIndex: number, bitValue: number) {
    return (digits[classIndex] & bitValue) !== 0;
  }

  function toggleBit(classIndex: number, bitValue: number) {
    setDigits((prev) => {
      const next = [...prev] as [number, number, number];
      next[classIndex] = next[classIndex] ^ bitValue;
      return next;
    });
  }

  async function apply() {
    if (!targetPath) return;
    const octal = digits.join("");
    const updated = await window.fileAPI.setPermissions(targetPath, octal);
    setInfo(updated);
    closeModal();
  }

  if (!targetPath) return null;

  return (
    <Modal title="Permissions" onClose={closeModal} width="400px">
      <div className="space-y-3 text-sm">
        <div className="truncate text-xs text-gray-400">{targetPath}</div>
        {info && (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left font-normal"></th>
                  {BITS.map((b) => (
                    <th key={b.label} className="font-normal">
                      {b.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CLASSES.map((cls, classIndex) => (
                  <tr key={cls}>
                    <td className="py-1 capitalize text-gray-600 dark:text-gray-300">{cls}</td>
                    {BITS.map((b) => (
                      <td key={b.label} className="text-center">
                        <input
                          type="checkbox"
                          checked={hasBit(classIndex, b.value)}
                          onChange={() => toggleBit(classIndex, b.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-gray-400">Octal: {digits.join("")}</div>
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={apply}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}
