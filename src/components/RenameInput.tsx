import { useEffect, useRef } from "react";

export function RenameInput({
  defaultValue,
  onCommit,
  onCancel,
  className,
}: {
  defaultValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dotIndex = defaultValue.lastIndexOf(".");
    el.setSelectionRange(0, dotIndex > 0 ? dotIndex : defaultValue.length);
  }, [defaultValue]);

  return (
    <input
      ref={ref}
      defaultValue={defaultValue}
      className={className}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onCommit(e.currentTarget.value);
        if (e.key === "Escape") onCancel();
      }}
      onBlur={(e) => onCommit(e.currentTarget.value)}
    />
  );
}
