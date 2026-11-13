import { app, BrowserWindow, screen } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = { width: 1280, height: 800, isMaximized: false };

function getStatePath() {
  return path.join(app.getPath("userData"), "window-state.json");
}

export function loadWindowState(): WindowState {
  try {
    const raw = JSON.parse(fs.readFileSync(getStatePath(), "utf8")) as WindowState;
    const display = screen.getDisplayMatching({ x: raw.x ?? 0, y: raw.y ?? 0, width: raw.width, height: raw.height });
    const withinBounds =
      raw.x !== undefined &&
      raw.y !== undefined &&
      raw.x >= display.bounds.x &&
      raw.y >= display.bounds.y &&
      raw.x < display.bounds.x + display.bounds.width &&
      raw.y < display.bounds.y + display.bounds.height;
    return withinBounds ? raw : { ...raw, x: undefined, y: undefined };
  } catch {
    return DEFAULT_STATE;
  }
}

export function trackWindowState(win: BrowserWindow) {
  let saveTimer: NodeJS.Timeout | null = null;

  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const bounds = win.getBounds();
        const state: WindowState = { ...bounds, isMaximized: win.isMaximized() };
        fs.writeFileSync(getStatePath(), JSON.stringify(state));
      } catch {
        // best-effort persistence
      }
    }, 300);
  }

  win.on("resize", save);
  win.on("move", save);
  win.on("close", save);
}
