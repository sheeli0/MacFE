import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";

let nextId = 1;

function getInitialPath() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("path") || "/Users";
  } catch {
    return "/Users";
  }
}

function makePane(path = "/Users") {
  return { id: nextId++, path, history: [path], historyIdx: 0, selected: [], viewMode: "list" };
}

const [windowStore, setWindowStore] = createStore({
  panes: [makePane(getInitialPath())],
  activePane: 0,
  showHidden: false,
  previewOpen: false,
});

export { windowStore };

export const [searchOpen, setSearchOpen] = createSignal(false);
export const [infoTrigger, setInfoTrigger] = createSignal(0);
export const [newFolderTrigger, setNewFolderTrigger] = createSignal(0);

export const triggerInfo = () => setInfoTrigger((n) => n + 1);
export const triggerNewFolder = () => setNewFolderTrigger((n) => n + 1);

function withPane(paneId, fn) {
  const idx = windowStore.panes.findIndex((p) => p.id === paneId);
  if (idx !== -1) fn(idx, windowStore.panes[idx]);
}

export function togglePreview() {
  setWindowStore("previewOpen", (v) => !v);
}

export function toggleHiddenFiles() {
  setWindowStore("showHidden", (v) => !v);
}

export function addPane() {
  const active = windowStore.panes[windowStore.activePane];
  const newPane = makePane(active ? active.path : "/Users");
  setWindowStore("panes", (p) => [...p, newPane]);
  setWindowStore("activePane", windowStore.panes.length - 1);
}

export function removePane(id) {
  if (windowStore.panes.length <= 1) return;
  withPane(id, () => {
    setWindowStore("panes", (p) => p.filter((pane) => pane.id !== id));
    setWindowStore("activePane", Math.min(windowStore.activePane, windowStore.panes.length - 1));
  });
}

export function setActivePaneId(id) {
  withPane(id, (idx) => setWindowStore("activePane", idx));
}

export function navigateTo(paneId, path) {
  withPane(paneId, (idx, pane) => {
    const newHistory = pane.history.slice(0, pane.historyIdx + 1).concat(path);
    setWindowStore("panes", idx, {
      path,
      history: newHistory,
      historyIdx: newHistory.length - 1,
      selected: [],
    });
  });
}

export function navigateBack(paneId) {
  withPane(paneId, (idx, pane) => {
    if (pane.historyIdx <= 0) return;
    const newIdx = pane.historyIdx - 1;
    setWindowStore("panes", idx, { historyIdx: newIdx, path: pane.history[newIdx], selected: [] });
  });
}

export function navigateForward(paneId) {
  withPane(paneId, (idx, pane) => {
    if (pane.historyIdx >= pane.history.length - 1) return;
    const newIdx = pane.historyIdx + 1;
    setWindowStore("panes", idx, { historyIdx: newIdx, path: pane.history[newIdx], selected: [] });
  });
}

export function navigateUp(paneId) {
  withPane(paneId, (_idx, pane) => {
    const parts = pane.path.replace(/\/$/, "").split("/");
    if (parts.length <= 1) return;
    parts.pop();
    navigateTo(paneId, parts.join("/") || "/");
  });
}

export function setSelection(paneId, selected) {
  withPane(paneId, (idx) => setWindowStore("panes", idx, "selected", selected));
}

export function setViewMode(paneId, viewMode) {
  withPane(paneId, (idx) => setWindowStore("panes", idx, "viewMode", viewMode));
}
