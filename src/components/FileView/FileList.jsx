import { For, Show, createMemo, createSignal } from "solid-js";
import FileIcon from "./FileIcon";
import { useMarqueeSelect } from "../../lib/useMarqueeSelect";

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

export default function FileList({ files, selected = [], cutPaths = [], focusIdx, onOpen, onSelect, onFocusIdx, onContextMenu }) {
  const [sortKey, setSortKey] = createSignal("name");
  const [sortAsc, setSortAsc] = createSignal(true);
  let listRef;

  const sorted = createMemo(() => {
    const key = sortKey();
    const asc = sortAsc();
    return [...files].sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      let av = a[key], bv = b[key];
      if (key === "name") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
  });

  const { marquee, onMouseDown, consumeSuppressClick } = useMarqueeSelect({
    getContainer: () => listRef,
    getSelected: () => selected,
    onSelect,
  });

  function toggleSort(key) {
    if (sortKey() === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  function handleClick(e, file, idx) {
    if (consumeSuppressClick()) return;
    if (e.shiftKey && focusIdx >= 0) {
      const list = sorted();
      const start = Math.min(focusIdx, idx);
      const end = Math.max(focusIdx, idx);
      onSelect?.(list.slice(start, end + 1).map(f => f.path));
      return;
    }
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
        class="flex items-center shrink-0 text-[11px] font-medium uppercase tracking-wider select-none px-1"
        style="height:28px; background:var(--panel); border-bottom:1px solid var(--border); color:var(--muted)"
      >
        {COLUMNS.map(col => (
          <div
            class="flex items-center gap-1 px-2.5 cursor-pointer hover:text-[#ececef] transition-colors"
            style={`flex:${col.flex}`}
            onClick={() => toggleSort(col.key)}
          >
            {col.label}
            {sortKey() === col.key && <span class="text-[10px]">{sortAsc() ? "↑" : "↓"}</span>}
          </div>
        ))}
      </div>

      {/* Rows + Marquee */}
      <div
        ref={listRef}
        class="flex-1 overflow-y-auto relative py-1"
        onMouseDown={onMouseDown}
      >
        <For each={sorted()}>
          {(file, i) => {
            const isSelected = () => selected.includes(file.path);
            const isFocused = () => focusIdx === i();
            const isCut = () => cutPaths.includes(file.path);
            return (
              <div
                data-file-path={file.path}
                class={`flex items-center cursor-pointer transition-colors text-[13px] mx-1 rounded px-0.5 fe-row ${isSelected() ? "fe-row-selected" : ""}`}
                style={`height:28px; background:${isFocused() && !isSelected() ? "var(--panel)" : "transparent"}; color:var(--text); opacity:${isCut() ? 0.45 : 1}`}
                onClick={(e) => handleClick(e, file, i())}
                onDblClick={() => onOpen?.(file)}
                onContextMenu={(e) => onContextMenu?.(e, file)}
              >
                <div class="flex items-center gap-2.5 px-2 min-w-0" style="flex:3">
                  <FileIcon file={file} size={15} />
                  <span class="truncate">{file.name}</span>
                </div>
                <div class="px-2.5 truncate text-[12px]" style="flex:1;color:var(--muted)">{formatSize(file.size, file.is_dir)}</div>
                <div class="px-2.5 truncate text-[12px]" style="flex:2;color:var(--muted)">{formatDate(file.modified)}</div>
              </div>
            );
          }}
        </For>

        <Show when={marquee()}>
          {(m) => (
            <div
              class="fe-marquee"
              style={`left:${m().left}px; top:${m().top}px; width:${m().width}px; height:${m().height}px`}
            />
          )}
        </Show>
      </div>
    </div>
  );
}
