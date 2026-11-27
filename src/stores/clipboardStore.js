import { createStore } from "solid-js/store";
import { setClipboard as tauriSetClipboard, getClipboard as tauriGetClipboard, clearClipboard as tauriClearClipboard } from "../lib/tauri";

const [clipboardStore, setClipboardStore] = createStore({
  paths: [],
  isCut: false,
});

export { clipboardStore };

export function copyFiles(paths) {
  const list = [...paths];
  setClipboardStore({ paths: list, isCut: false });
  tauriSetClipboard(list, false).catch(() => {});
}

export function cutFiles(paths) {
  const list = [...paths];
  setClipboardStore({ paths: list, isCut: true });
  tauriSetClipboard(list, true).catch(() => {});
}

export async function syncClipboardFromBackend() {
  try {
    const payload = await tauriGetClipboard();
    if (payload && Array.isArray(payload.paths) && payload.paths.length > 0) {
      setClipboardStore({ paths: payload.paths, isCut: !!payload.is_cut });
    }
  } catch {}
}

export function clearClipboard() {
  setClipboardStore({ paths: [], isCut: false });
  tauriClearClipboard().catch(() => {});
}
