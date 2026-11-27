import { createSignal, createEffect, createMemo, For, Show } from "solid-js";
import { Search, X, File, Folder } from "lucide-solid";
import { searchFiles } from "../../lib/tauri";
import { windowStore, navigateTo } from "../../stores/windowStore";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "files", label: "Files" },
  { id: "folders", label: "Folders" },
  { id: "code", label: "Code" },
  { id: "images", label: "Images" },
];

const CODE_EXTS = new Set(["js", "ts", "jsx", "tsx", "py", "rs", "go", "java", "c", "cpp", "h", "html", "css", "json", "toml", "yaml", "yml", "md", "sh"]);
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"]);

export default function SearchOverlay(props) {
  const [query, setQuery] = createSignal("");
  const [filter, setFilter] = createSignal("all");
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
      searchFiles(root, q, 250)
        .then(r => { setResults(r || []); setLoading(false); })
        .catch(() => { setResults([]); setLoading(false); });
    }, 220);
  });

  const filteredResults = createMemo(() => {
    const f = filter();
    const list = results();
    if (f === "all") return list;
    if (f === "files") return list.filter((r) => !r.is_dir);
    if (f === "folders") return list.filter((r) => r.is_dir);
    if (f === "code") {
      return list.filter((r) => {
        const ext = r.name.split(".").pop()?.toLowerCase();
        return !r.is_dir && CODE_EXTS.has(ext);
      });
    }
    if (f === "images") {
      return list.filter((r) => {
        const ext = r.name.split(".").pop()?.toLowerCase();
        return !r.is_dir && IMAGE_EXTS.has(ext);
      });
    }
    return list;
  });

  function handleResultClick(result) {
    const p = activePane();
    if (!p) return;
    if (result.is_dir) {
      navigateTo(p.id, result.path);
    } else {
      const parent = result.path.substring(0, result.path.lastIndexOf("/")) || "/";
      navigateTo(p.id, parent);
    }
    props.onClose();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") props.onClose();
  }

  return (
    <div
      class="fixed inset-0 z-50 flex flex-col"
      style="background:rgba(0,0,0,0.6)"
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
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
          <button class="fe-icon-btn" onClick={props.onClose}><X size={16} /></button>
        </div>

        {/* Filter pills */}
        <div class="flex items-center gap-1.5 px-4 py-2" style="border-bottom:1px solid var(--border)">
          <For each={FILTERS}>
            {(f) => (
              <button
                class="px-2.5 py-0.5 rounded-full text-xs transition-colors"
                style={filter() === f.id
                  ? "background:var(--accent); color:#fff"
                  : "background:var(--bg); color:var(--muted); border:1px solid var(--border)"}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            )}
          </For>
          <span class="ml-auto text-xs" style="color:var(--muted)">
            {filteredResults().length > 0 ? `${filteredResults().length} matches` : ""}
          </span>
        </div>

        {/* Results */}
        <div class="overflow-y-auto flex-1">
          <Show when={loading()}>
            <div class="flex items-center justify-center py-8" style="color:var(--muted)">Searching…</div>
          </Show>
          <Show when={!loading() && query() && filteredResults().length === 0}>
            <div class="flex items-center justify-center py-8" style="color:var(--muted)">No results</div>
          </Show>
          <For each={filteredResults()}>
            {(r) => (
              <div
                class="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors fe-row"
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
