import { createSignal, createEffect, For, Show } from "solid-js";
import { Search, X, File, Folder } from "lucide-solid";
import { searchFiles } from "../../lib/tauri";
import { windowStore, navigateTo } from "../../stores/windowStore";

export default function SearchOverlay({ onClose }) {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  let debounce;

  const activePane = () => windowStore.panes[windowStore.activePane];

  createEffect(() => {
    const q = query();
    clearTimeout(debounce);
    if (!q.trim()) { setResults([]); return; }
    debounce = setTimeout(() => {
      const root = activePane()?.path || "/";
      setLoading(true);
      searchFiles(root, q, 200)
        .then(r => { setResults(r || []); setLoading(false); })
        .catch(() => { setResults([]); setLoading(false); });
    }, 300);
  });

  function handleResultClick(result) {
    const p = activePane();
    if (!p) return;
    const parent = result.path.substring(0, result.path.lastIndexOf("/")) || "/";
    navigateTo(p.id, parent);
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      class="fixed inset-0 z-50 flex flex-col"
      style="background:rgba(0,0,0,0.6)"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        class="w-full flex flex-col"
        style="max-height:70vh; background:var(--panel); border-bottom:1px solid var(--border)"
      >
        {/* Search input */}
        <div class="flex items-center gap-2 px-4" style="height:48px; border-bottom:1px solid var(--border)">
          <Search size={16} style="color:var(--muted)" />
          <input
            class="flex-1 bg-transparent outline-none border-none text-sm"
            style="color:var(--text)"
            placeholder="Search files…"
            value={query()}
            onInput={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={el => setTimeout(() => el?.focus(), 0)}
          />
          <button class="fe-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Results */}
        <div class="overflow-y-auto flex-1">
          <Show when={loading()}>
            <div class="flex items-center justify-center py-8" style="color:var(--muted)">Searching…</div>
          </Show>
          <Show when={!loading() && query() && results().length === 0}>
            <div class="flex items-center justify-center py-8" style="color:var(--muted)">No results</div>
          </Show>
          <For each={results()}>
            {(r) => (
              <div
                class="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors"
                style="color:var(--text)"
                onClick={() => handleResultClick(r)}
              >
                <Show when={r.is_dir} fallback={<File size={14} style="color:var(--muted);flex-shrink:0" />}>
                  <Folder size={14} style="color:#d4a017;flex-shrink:0" />
                </Show>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs truncate">{r.name}</span>
                  <span class="text-xs truncate" style="color:var(--muted)">{r.path}</span>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
