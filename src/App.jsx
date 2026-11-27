import { onMount, onCleanup } from "solid-js";
import AppShell from "./components/AppShell";
import { windowStore, addPane, toggleHiddenFiles } from "./stores/windowStore";
import { createNewWindow } from "./lib/tauri";

export default function App() {
  function handleKeydown(e) {
    if (!e.metaKey) return;

    if (e.key === "n" || e.key === "N") {
      if (e.shiftKey) {
        e.preventDefault();
        window.__feNewFolder?.();
      } else {
        e.preventDefault();
        const active = windowStore.panes[windowStore.activePane];
        createNewWindow(active?.path || "/Users").catch(() => addPane());
      }
    } else if (e.shiftKey && (e.key === "p" || e.key === "P")) {
      e.preventDefault();
      addPane();
    } else if (e.shiftKey && e.key === ".") {
      e.preventDefault();
      toggleHiddenFiles();
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      window.__feOpenSearch?.();
    } else if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      window.__feOpenInfo?.();
    }
  }

  onMount(() => window.addEventListener("keydown", handleKeydown));
  onCleanup(() => window.removeEventListener("keydown", handleKeydown));

  return <AppShell />;
}
