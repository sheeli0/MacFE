import { createStore } from "solid-js/store";

let nextId = 1;

function makePane(path = "/") {
  return { id: nextId++, path, history: [path], historyIdx: 0, selected: [] };
}

const [windowStore, setWindowStore] = createStore({
  panes: [makePane("/Users")],
  activePane: 0,
});

export { windowStore };

export function addPane() {
  const active = windowStore.panes[windowStore.activePane];
  const newPane = makePane(active ? active.path : "/Users");
  setWindowStore("panes", (p) => [...p, newPane]);
  setWindowStore("activePane", windowStore.panes.length - 1);
}

export function removePane(id) {
  if (windowStore.panes.length <= 1) return;
  const idx = windowStore.panes.findIndex((p) => p.id === id);
  if (idx === -1) return;
  setWindowStore("panes", (p) => p.filter((pane) => pane.id !== id));
  const newActive = Math.min(windowStore.activePane, windowStore.panes.length - 1);
  setWindowStore("activePane", newActive);
}

export function setActivePaneId(id) {
  const idx = windowStore.panes.findIndex((p) => p.id === id);
  if (idx !== -1) setWindowStore("activePane", idx);
}

export function navigateTo(paneId, path) {
  const idx = windowStore.panes.findIndex((p) => p.id === paneId);
  if (idx === -1) return;
  const pane = windowStore.panes[idx];
  const newHistory = pane.history.slice(0, pane.historyIdx + 1).concat(path);
  setWindowStore("panes", idx, "path", path);
  setWindowStore("panes", idx, "history", newHistory);
  setWindowStore("panes", idx, "historyIdx", newHistory.length - 1);
  setWindowStore("panes", idx, "selected", []);
}

export function navigateBack(paneId) {
  const idx = windowStore.panes.findIndex((p) => p.id === paneId);
  if (idx === -1) return;
  const pane = windowStore.panes[idx];
  if (pane.historyIdx <= 0) return;
  const newIdx = pane.historyIdx - 1;
  setWindowStore("panes", idx, "historyIdx", newIdx);
  setWindowStore("panes", idx, "path", pane.history[newIdx]);
  setWindowStore("panes", idx, "selected", []);
}

export function navigateForward(paneId) {
  const idx = windowStore.panes.findIndex((p) => p.id === paneId);
  if (idx === -1) return;
  const pane = windowStore.panes[idx];
  if (pane.historyIdx >= pane.history.length - 1) return;
  const newIdx = pane.historyIdx + 1;
  setWindowStore("panes", idx, "historyIdx", newIdx);
  setWindowStore("panes", idx, "path", pane.history[newIdx]);
  setWindowStore("panes", idx, "selected", []);
}

export function setSelection(paneId, selected) {
  const idx = windowStore.panes.findIndex((p) => p.id === paneId);
  if (idx === -1) return;
  setWindowStore("panes", idx, "selected", selected);
}
