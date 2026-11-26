import { For } from "solid-js";
import FileIcon from "./FileIcon";

export default function FileGrid({ files, selected = [], onOpen, onSelect, onContextMenu }) {
  function handleClick(e, file) {
    if (e.metaKey) {
      const already = selected.includes(file.path);
      onSelect?.(already ? selected.filter(p => p !== file.path) : [...selected, file.path]);
    } else {
      onSelect?.([file.path]);
    }
  }

  return (
    <div
      class="p-3 overflow-y-auto h-full"
      style="display:grid; grid-template-columns:repeat(auto-fill,minmax(80px,1fr)); gap:8px; align-content:start"
    >
      <For each={files}>
        {(file) => {
          const isSelected = () => selected.includes(file.path);
          return (
            <div
              class="flex flex-col items-center gap-1 p-2 rounded cursor-pointer transition-colors"
              style={`background:${isSelected() ? "var(--accent-dim)" : "transparent"}; color:var(--text)`}
              onClick={(e) => handleClick(e, file)}
              onDblClick={() => onOpen?.(file)}
              onContextMenu={(e) => onContextMenu?.(e, file)}
            >
              <FileIcon file={file} size={36} />
              <span class="text-xs text-center truncate w-full leading-tight">{file.name}</span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
