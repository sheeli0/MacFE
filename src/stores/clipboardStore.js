import { createStore } from "solid-js/store";

const [clipboardStore, setClipboardStore] = createStore({
  paths: [],
  isCut: false,
});

export { clipboardStore };

export function copyFiles(paths) {
  setClipboardStore({ paths: [...paths], isCut: false });
}

export function cutFiles(paths) {
  setClipboardStore({ paths: [...paths], isCut: true });
}

export function clearClipboard() {
  setClipboardStore({ paths: [], isCut: false });
}
