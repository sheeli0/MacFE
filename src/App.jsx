import { onMount, onCleanup } from "solid-js";
import AppShell from "./components/AppShell";
import { windowStore, addPane } from "./stores/windowStore";

export default function App() {
  function handleKeydown(e) {
    const isMeta = e.metaKey;
    if (!isMeta) return;

    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      addPane();
    }
    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      window.__feOpenSearch?.();
    }
    if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      window.__feOpenInfo?.();
    }
  }

  onMount(() => window.addEventListener("keydown", handleKeydown));
  onCleanup(() => window.removeEventListener("keydown", handleKeydown));

  return <AppShell />;
}
