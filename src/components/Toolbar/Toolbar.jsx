import { createMemo } from "solid-js";
import { ChevronLeft, ChevronRight, ChevronUp, Search, Plus, Minus, List, Grid, AppWindow, Eye, EyeOff, FolderPlus } from "lucide-solid";
import { windowStore, navigateBack, navigateForward, navigateTo, addPane, removePane, setViewMode, toggleHiddenFiles } from "../../stores/windowStore";
import { createNewWindow } from "../../lib/tauri";
import PathBar from "./PathBar";

export default function Toolbar(props) {
  const activePane = createMemo(() => windowStore.panes[windowStore.activePane]);

  const canGoBack = createMemo(() => {
    const p = activePane();
    return p && p.historyIdx > 0;
  });

  const canGoForward = createMemo(() => {
    const p = activePane();
    return p && p.historyIdx < p.history.length - 1;
  });

  const canRemove = createMemo(() => windowStore.panes.length > 1);

  function goBack() {
    const p = activePane();
    if (p) navigateBack(p.id);
  }

  function goForward() {
    const p = activePane();
    if (p) navigateForward(p.id);
  }

  function goUp() {
    const p = activePane();
    if (!p) return;
    const parts = p.path.replace(/\/$/, "").split("/");
    if (parts.length <= 1) return;
    parts.pop();
    const parent = parts.join("/") || "/";
    navigateTo(p.id, parent);
  }

  function handleRemovePane() {
    const p = activePane();
    if (p) removePane(p.id);
  }

  return (
    <div
      class="flex items-center gap-1 px-2 shrink-0"
      style="height:40px; background:var(--panel); border-bottom:1px solid var(--border)"
    >
      {/* Back/Forward/Up */}
      <button class="fe-icon-btn" disabled={!canGoBack()} onClick={goBack} title="Back">
        <ChevronLeft size={16} />
      </button>
      <button class="fe-icon-btn" disabled={!canGoForward()} onClick={goForward} title="Forward">
        <ChevronRight size={16} />
      </button>
      <button class="fe-icon-btn" onClick={goUp} title="Up">
        <ChevronUp size={16} />
      </button>

      <div class="w-px h-5 mx-1" style="background:var(--border)" />

      {/* Path bar stretches */}
      <div class="flex-1 min-w-0 mx-1">
        <PathBar />
      </div>

      <div class="w-px h-5 mx-1" style="background:var(--border)" />

      {/* View mode toggle */}
      <button
        class={`fe-icon-btn ${activePane()?.viewMode !== "grid" ? "active" : ""}`}
        onClick={() => activePane() && setViewMode(activePane().id, "list")}
        title="List View"
      >
        <List size={15} />
      </button>
      <button
        class={`fe-icon-btn ${activePane()?.viewMode === "grid" ? "active" : ""}`}
        onClick={() => activePane() && setViewMode(activePane().id, "grid")}
        title="Grid View"
      >
        <Grid size={15} />
      </button>

      {/* Hidden files toggle */}
      <button
        class={`fe-icon-btn ${windowStore.showHidden ? "active" : ""}`}
        onClick={toggleHiddenFiles}
        title="Toggle Hidden Files (⌘⇧.)"
      >
        {windowStore.showHidden ? <Eye size={15} /> : <EyeOff size={15} />}
      </button>

      {/* New folder */}
      <button
        class="fe-icon-btn"
        onClick={() => window.__feNewFolder?.()}
        title="New Folder (⌘⇧N)"
      >
        <FolderPlus size={15} />
      </button>

      <div class="w-px h-5 mx-1" style="background:var(--border)" />

      {/* Search */}
      <button class="fe-icon-btn" onClick={props.onSearch} title="Search (⌘F)">
        <Search size={16} />
      </button>

      {/* Add/Remove Pane */}
      <button class="fe-icon-btn" onClick={addPane} title="Add Pane (⌘⇧P)">
        <Plus size={16} />
      </button>
      <button class="fe-icon-btn" disabled={!canRemove()} onClick={handleRemovePane} title="Remove Pane">
        <Minus size={16} />
      </button>

      {/* New OS Window */}
      <button
        class="fe-icon-btn"
        onClick={() => createNewWindow(activePane()?.path || "/Users").catch(() => addPane())}
        title="New Window (⌘N)"
      >
        <AppWindow size={15} />
      </button>
    </div>
  );
}
