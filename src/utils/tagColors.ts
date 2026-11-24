import type { TagColor } from "@/types";

export const TAG_HEX: Record<TagColor, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  gray: "#9ca3af",
};

// A lighter tint of each color, used as the top gradient stop for
// colored folder icons (paired with TAG_HEX as the darker bottom stop).
export const TAG_HEX_LIGHT: Record<TagColor, string> = {
  red: "#fca5a5",
  orange: "#fdba74",
  yellow: "#fde047",
  green: "#86efac",
  blue: "#93c5fd",
  purple: "#d8b4fe",
  gray: "#d1d5db",
};
