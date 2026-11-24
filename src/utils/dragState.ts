// Dragging a row out of FileList uses Electron's native OS-level
// drag (window.fileAPI.startDrag), not the browser's own HTML5 drag
// session — that's required so the drag can land on Finder/Explorer
// or another app. But that means a drop target *inside* this same
// window can't reliably read the dragged paths back out of
// DragEvent.dataTransfer, since no standard browser drag ever started.
// This tracks the in-progress paths outside React/dataTransfer so an
// in-app drop zone (e.g. the sidebar's My Favorites) can read them
// directly. Drops originating from outside the app (e.g. Finder)
// still go through the normal dataTransfer.files path.
let current: string[] = [];

export function setDraggingPaths(paths: string[]) {
  current = paths;
}

export function getDraggingPaths(): string[] {
  return current;
}

export function clearDraggingPaths() {
  current = [];
}
