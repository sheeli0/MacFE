import { For, createMemo, createSignal } from "solid-js";
import { Folder, Clock, Plus, X, HardDrive, Home, Search } from "lucide-solid";
import { bookmarkStore, addFavorite, removeFavorite, clearRecent } from "../../stores/bookmarkStore";
import { windowStore, navigateTo } from "../../stores/windowStore";

const LOCATIONS = [
  { name: "Users", path: "/Users", icon: Home },
  { name: "Applications", path: "/Applications", icon: Folder },
  { name: "Macintosh HD", path: "/", icon: HardDrive },
];

export default function Sidebar() {
  const [filter, setFilter] = createSignal("");
  const activePane = createMemo(() => windowStore.panes[windowStore.activePane]);
  const currentPath = createMemo(() => activePane()?.path);

  function navigate(path) {
    const p = activePane();
    if (p) navigateTo(p.id, path);
  }

  function handleAddFavorite() {
    const p = activePane();
    if (p) addFavorite(p.path);
  }

  const filteredFavorites = createMemo(() => {
    const q = filter().trim().toLowerCase();
    if (!q) return bookmarkStore.favorites;
    return bookmarkStore.favorites.filter(
      (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    );
  });

  const recentSlice = createMemo(() => {
    const q = filter().trim().toLowerCase();
    const list = bookmarkStore.recent.slice(0, 20);
    if (!q) return list.slice(0, 10);
    return list.filter((p) => p.toLowerCase().includes(q)).slice(0, 10);
  });

  return (
    <div
      class="flex flex-col shrink-0 overflow-y-auto py-2"
      style="width:210px; background:var(--panel-alt); border-right:1px solid var(--border)"
    >
      {/* Quick-jump filter */}
      <div class="px-2.5 pb-2">
        <div
          class="flex items-center gap-1.5 px-2 rounded-md"
          style="height:26px; background:var(--bg); border:1px solid var(--border)"
        >
          <Search size={12} class="shrink-0" style="color:var(--muted)" />
          <input
            class="w-full bg-transparent border-none outline-none text-[12px]"
            style="color:var(--text)"
            placeholder="Filter bookmarks…"
            value={filter()}
            onInput={(e) => setFilter(e.target.value)}
          />
          {filter() && (
            <button class="fe-icon-btn w-4 h-4" onClick={() => setFilter("")}>
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Locations */}
      <div class="px-3 pt-1 pb-1">
        <span class="text-[11px] font-semibold uppercase tracking-wider" style="color:var(--muted)">
          Locations
        </span>
      </div>
      <For each={LOCATIONS}>
        {(loc) => {
          const Icon = loc.icon;
          const active = () => currentPath() === loc.path;
          return (
            <div
              class={`flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-md cursor-pointer transition-colors fe-row ${active() ? "fe-row-selected" : ""}`}
              style="color:var(--text)"
              onClick={() => navigate(loc.path)}
            >
              <Icon size={14} class="shrink-0" style="color:var(--accent)" />
              <span class="truncate text-[13px]">{loc.name}</span>
            </div>
          );
        }}
      </For>

      {/* Favorites section */}
      <div class="flex items-center justify-between px-3 pt-4 pb-1">
        <span class="text-[11px] font-semibold uppercase tracking-wider" style="color:var(--muted)">
          Favorites
        </span>
        <button class="fe-icon-btn w-5 h-5" onClick={handleAddFavorite} title="Pin current folder">
          <Plus size={12} />
        </button>
      </div>
      <For each={filteredFavorites()}>
        {(fav) => {
          const active = () => currentPath() === fav.path;
          return (
            <div
              class={`flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-md cursor-pointer group transition-colors fe-row ${active() ? "fe-row-selected" : ""}`}
              style="color:var(--text)"
              onClick={() => navigate(fav.path)}
              onContextMenu={(e) => { e.preventDefault(); removeFavorite(fav.path); }}
            >
              <Folder size={14} class="shrink-0" style="color:#d4a017" />
              <span class="truncate text-[13px] flex-1">{fav.name}</span>
              <button
                class="opacity-0 group-hover:opacity-100 fe-icon-btn w-4 h-4 transition-opacity"
                onClick={(e) => { e.stopPropagation(); removeFavorite(fav.path); }}
                title="Remove"
              >
                <X size={10} />
              </button>
            </div>
          );
        }}
      </For>

      {/* Recent section */}
      <div class="flex items-center justify-between px-3 pt-4 pb-1">
        <span class="text-[11px] font-semibold uppercase tracking-wider" style="color:var(--muted)">
          Recent
        </span>
        <button class="fe-icon-btn w-5 h-5" onClick={clearRecent} title="Clear recent">
          <X size={10} />
        </button>
      </div>
      <For each={recentSlice()}>
        {(path) => {
          const name = path.split("/").filter(Boolean).pop() || path;
          const active = () => currentPath() === path;
          return (
            <div
              class={`flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-md cursor-pointer transition-colors fe-row ${active() ? "fe-row-selected" : ""}`}
              style="color:var(--muted)"
              onClick={() => navigate(path)}
              title={path}
            >
              <Clock size={13} class="shrink-0" />
              <span class="truncate text-[13px]">{name}</span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
