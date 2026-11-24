import { useId, type CSSProperties } from "react";
import type { TagColor } from "@/types";
import { TAG_HEX, TAG_HEX_LIGHT } from "@/utils/tagColors";

export function FolderIcon({
  className,
  style,
  color,
}: {
  className?: string;
  style?: CSSProperties;
  color?: TagColor;
}) {
  const gradId = useId();
  const from = color ? TAG_HEX_LIGHT[color] : "#7cb3ff";
  const to = color ? TAG_HEX[color] : "#2f66d6";
  const tab = color ? TAG_HEX_LIGHT[color] : "#9cc4ff";

  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <g transform="translate(12 12) scale(1.2) translate(-12 -12)">
        <rect x="3" y="7" width="18" height="12" rx="2.2" fill={`url(#${gradId})`} />
        <rect x="3" y="5" width="9" height="4" rx="1.4" fill={tab} />
        <rect x="7" y="12.2" width="10" height="1.6" rx="0.8" fill="#ffffff" opacity="0.85" />
      </g>
    </svg>
  );
}
