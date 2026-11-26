import { For, createMemo } from "solid-js";
import { Folder, Clock, Plus, X } from "lucide-solid";
import { bookmarkStore, addFavorite, removeFavorite, clearRecent } from "../../stores/bookmarkStore";
import { windowStore, navigateTo } from "../../stores/windowStore";

export default function Sidebar() {
  const activePane = createMemo(() => windowStore.panes[windowStore.activePane]);

  function navigate(path) {
    const p = activePane();
    if (p) navigateTo(p.id, path);
  }

  function handleAddFavorite() {
    const p = activePane();
    if (p) addFavorite(p.path);
  }

  const recentSlice = createMemo(() => bookmarkStore.recent.slice(0, 10));

  return (
    <div
      class="flex flex-col shrink-0 overflow-y-auto"
      style="width:200px; background:var(--panel-alt); border-right:1px solid var(--border)"
    >
      {/* Favorites section */}
      <div class="flex items-center justify-between px-3 pt-3 pb-1">
        <span class="text-xs font-semibold uppercase tracking-widest" style="color:var(--muted)">
          Favorites
        </span>
        <button class="fe-icon-btn w-5 h-5" onClick={handleAddFavorite} title="Add current dir">
          <Plus size={12} />
        </button>
      </div>
      <For each={bookmarkStore.favorites}>
        {(fav) => (
          <div
            class="flex items-center gap-2 px-3 py-1 cursor-pointer group transition-colors"
            style="color:var(--text)"
            onClick={() => navigate(fav.path)}
            onContextMenu={(e) => { e.preventDefault(); removeFavorite(fav.path); }}
          >
            <Folder size={14} style="color:#d4a017; shrink-0" />
            <span class="truncate text-xs flex-1">{fav.name}</span>
            <button
              class="opacity-0 group-hover:opacity-100 fe-icon-btn w-4 h-4 transition-opacity"
              onClick={(e) => { e.stopPropagation(); removeFavorite(fav.path); }}
            >
              <X size={10} />
            </button>
          </div>
        )}
      </For>

      <div class="mt-2" />

      {/* Recent section */}
      <div class="flex items-center justify-between px-3 pt-2 pb-1">
        <span class="text-xs font-semibold uppercase tracking-widest" style="color:var(--muted)">
          Recent
        </span>
        <button class="fe-icon-btn w-5 h-5" onClick={clearRecent} title="Clear recent">
          <X size={10} />
        </button>
      </div>
      <For each={recentSlice()}>
        {(path) => {
          const name = path.split("/").filter(Boolean).pop() || path;
          return (
            <div
              class="flex items-center gap-2 px-3 py-1 cursor-pointer transition-colors"
              style="color:var(--muted)"
              onClick={() => navigate(path)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <Clock size={13} style="shrink-0" />
              <span class="truncate text-xs">{name}</span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
