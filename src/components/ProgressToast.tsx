import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { OperationProgress } from "@/types";

export function ProgressToast() {
  const [ops, setOps] = useState<Record<string, OperationProgress>>({});

  useEffect(() => {
    const unsubscribe = window.fileAPI.onProgress((progress) => {
      setOps((prev) => ({ ...prev, [progress.id]: progress }));
      if (progress.done) {
        setTimeout(() => {
          setOps((prev) => {
            const next = { ...prev };
            delete next[progress.id];
            return next;
          });
        }, 1200);
      }
    });
    return unsubscribe;
  }, []);

  const active = Object.values(ops);

  return (
    <div className="pointer-events-none absolute bottom-10 right-4 flex flex-col gap-2">
      <AnimatePresence>
        {active.map((op) => (
          <motion.div
            key={op.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-64 rounded-lg bg-black/80 p-3 text-xs text-white shadow-lg backdrop-blur"
          >
            <div className="mb-1 flex justify-between capitalize">
              <span>{op.done ? "Done" : op.op + "ing"}</span>
              <span>
                {op.current}/{op.total}
              </span>
            </div>
            <div className="mb-1 truncate text-gray-300">{op.currentFile}</div>
            <div className="h-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${op.total ? (op.current / op.total) * 100 : 0}%` }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
