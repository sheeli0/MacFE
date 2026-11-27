import { For, Show } from "solid-js";
import FileIcon from "./FileIcon";
import { useMarqueeSelect } from "../../lib/useMarqueeSelect";

export default function FileGrid(props) {
  let gridRef;
  let lastIdx = -1;

  const { marquee, onMouseDown, consumeSuppressClick } = useMarqueeSelect({
    getContainer: () => gridRef,
    getSelected: () => props.selected || [],
    onSelect: (paths) => props.onSelect?.(paths),
  });

  function handleClick(e, file, idx) {
    if (consumeSuppressClick()) return;
    const selected = props.selected || [];
    const files = props.files || [];
    if (e.shiftKey && lastIdx >= 0) {
      const start = Math.min(lastIdx, idx);
      const end = Math.max(lastIdx, idx);
      props.onSelect?.(files.slice(start, end + 1).map(f => f.path));
      return;
    }
    lastIdx = idx;
    if (e.metaKey) {
      const already = selected.includes(file.path);
      props.onSelect?.(already ? selected.filter(p => p !== file.path) : [...selected, file.path]);
    } else {
      props.onSelect?.([file.path]);
    }
  }

  function handleDragStart(e, file) {
    const selected = props.selected || [];
    const paths = selected.includes(file.path) ? selected : [file.path];
    e.dataTransfer.setData("application/x-fe-paths", JSON.stringify({ paths, sourcePaneId: props.paneId }));
    e.dataTransfer.effectAllowed = "copyMove";
  }

  return (
    <div
      ref={gridRef}
      class="p-3 overflow-y-auto h-full relative"
      style="display:grid; grid-template-columns:repeat(auto-fill,minmax(88px,1fr)); gap:8px; align-content:start"
      onMouseDown={onMouseDown}
    >
      <For each={props.files || []}>
        {(file, i) => {
          const isSelected = () => (props.selected || []).includes(file.path);
          const isCut = () => (props.cutPaths || []).includes(file.path);
          return (
            <div
              data-file-path={file.path}
              draggable={isSelected() && !marquee()}
              onDragStart={(e) => handleDragStart(e, file)}
              class={`flex flex-col items-center gap-1.5 p-2 rounded-md cursor-pointer transition-colors fe-row ${isSelected() ? "fe-row-selected" : ""}`}
              style={`color:var(--text); opacity:${isCut() ? 0.45 : 1}`}
              onClick={(e) => handleClick(e, file, i())}
              onDblClick={() => props.onOpen?.(file)}
              onContextMenu={(e) => props.onContextMenu?.(e, file)}
            >
              <FileIcon file={file} size={36} />
              <span class="text-[12px] text-center truncate w-full leading-tight">{file.name}</span>
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
  );
}
