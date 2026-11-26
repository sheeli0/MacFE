import { For, createMemo, createSignal } from "solid-js";
import FileIcon from "./FileIcon";

const COLUMNS = [
  { key: "name", label: "Name", flex: 3 },
  { key: "size", label: "Size", flex: 1 },
  { key: "modified", label: "Modified", flex: 2 },
];

function formatSize(size, isDir) {
  if (isDir) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function FileList({ files, selected = [], focusIdx, onOpen, onSelect, onFocusIdx, onContextMenu }) {
  const [sortKey, setSortKey] = createSignal("name");
  const [sortAsc, setSortAsc] = createSignal(true);

  const sorted = createMemo(() => {
    const key = sortKey();
    const asc = sortAsc();
    return [...files].sort((a, b) => {
      // Dirs first
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      let av = a[key], bv = b[key];
      if (key === "name") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
  });

  function toggleSort(key) {
    if (sortKey() === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  function handleClick(e, file, idx) {
    onFocusIdx?.(idx);
    if (e.metaKey) {
      const already = selected.includes(file.path);
      onSelect?.(already ? selected.filter(p => p !== file.path) : [...selected, file.path]);
    } else {
      onSelect?.([file.path]);
    }
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        class="flex items-center shrink-0 text-xs select-none"
        style="height:26px; background:var(--panel); border-bottom:1px solid var(--border); color:var(--muted)"
      >
        {COLUMNS.map(col => (
          <div
            class={`flex items-center gap-1 px-2 cursor-pointer hover:text-[#f0f0f0] transition-colors`}
            style={`flex:${col.flex}`}
            onClick={() => toggleSort(col.key)}
          >
            {col.label}
            {sortKey() === col.key && <span>{sortAsc() ? "↑" : "↓"}</span>}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div class="flex-1 overflow-y-auto">
        <For each={sorted()}>
          {(file, i) => {
            const isSelected = () => selected.includes(file.path);
            const isFocused = () => focusIdx === i();
            return (
              <div
                class="flex items-center cursor-pointer transition-colors text-xs"
                style={`height:26px; background:${isSelected() ? "var(--accent-dim)" : isFocused() ? "var(--panel)" : "transparent"}; color:var(--text)`}
                onClick={(e) => handleClick(e, file, i())}
                onDblClick={() => onOpen?.(file)}
                onContextMenu={(e) => onContextMenu?.(e, file)}
              >
                <div class="flex items-center gap-2 px-2 min-w-0" style="flex:3">
                  <FileIcon file={file} size={14} />
                  <span class="truncate">{file.name}</span>
                </div>
                <div class="px-2 truncate" style="flex:1;color:var(--muted)">{formatSize(file.size, file.is_dir)}</div>
                <div class="px-2 truncate" style="flex:2;color:var(--muted)">{formatDate(file.modified)}</div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
