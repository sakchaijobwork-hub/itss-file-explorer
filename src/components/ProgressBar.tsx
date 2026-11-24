import clsx from "clsx";

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-full bg-black/10 shadow-inner ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10",
        className
      )}
    >
      <div
        className="relative h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      >
        <div className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/25" />
      </div>
    </div>
  );
}
