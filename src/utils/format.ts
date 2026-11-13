export function formatBytes(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function basename(p: string): string {
  const normalized = p.replace(/[\\/]+$/, "");
  const idx = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  return idx === -1 ? normalized : normalized.slice(idx + 1);
}

export function joinPath(...parts: string[]): string {
  const sep = parts[0]?.includes("\\") ? "\\" : "/";
  return parts
    .map((p, i) => (i === 0 ? p.replace(/[/\\]+$/, "") : p.replace(/^[/\\]+|[/\\]+$/g, "")))
    .join(sep);
}

export function splitPathSegments(p: string): { label: string; path: string }[] {
  const isWindows = /^[A-Za-z]:\\/.test(p);
  const sep = isWindows ? "\\" : "/";
  const rawParts = p.split(/[/\\]/).filter(Boolean);
  const segments: { label: string; path: string }[] = [];

  if (isWindows) {
    const drive = rawParts[0] + sep;
    segments.push({ label: drive, path: drive });
    let acc = drive;
    for (let i = 1; i < rawParts.length; i++) {
      acc = acc.endsWith(sep) ? acc + rawParts[i] : acc + sep + rawParts[i];
      segments.push({ label: rawParts[i], path: acc });
    }
  } else {
    segments.push({ label: "/", path: "/" });
    let acc = "";
    for (const part of rawParts) {
      acc += "/" + part;
      segments.push({ label: part, path: acc });
    }
  }
  return segments;
}
