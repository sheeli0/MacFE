import { createSignal, createEffect, createMemo, Show } from "solid-js";
import { listDir } from "../../lib/tauri";
import { navigateTo, navigateBack, setSelection } from "../../stores/windowStore";
import { addRecent } from "../../stores/bookmarkStore";
import FileList from "../FileView/FileList";
import FileGrid from "../FileView/FileGrid";
import ContextMenu from "../ContextMenu/ContextMenu";
import PropertiesPanel from "../Dialogs/PropertiesPanel";

export default function FilePane({ pane, isActive }) {
  const [files, setFiles] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [viewMode, setViewMode] = createSignal("list"); // "list" | "grid"
  const [contextMenu, setContextMenu] = createSignal(null); // { x, y, file }
  const [propsFile, setPropsFile] = createSignal(null);
  const [focusIdx, setFocusIdx] = createSignal(-1);

  // Register global info handler for active pane
  createEffect(() => {
    if (isActive) {
      window.__feOpenInfo = () => {
        const sel = pane.selected;
        if (sel && sel.length > 0) {
          const f = files().find((x) => x.path === sel[0]);
          if (f) setPropsFile(f);
        }
      };
    }
  });

  createEffect(() => {
    const path = pane.path;
    if (!path) return;
    setLoading(true);
    setError(null);
    addRecent(path);
    listDir(path)
      .then((entries) => {
        setFiles(entries || []);
        setLoading(false);
      })
      .catch((err) => {
        // Fallback: show mock data for development
        setFiles([]);
        setError(String(err));
        setLoading(false);
      });
  });

  function openFile(file) {
    if (file.is_dir) {
      navigateTo(pane.id, file.path);
    }
  }

  function goUp() {
    const parts = pane.path.replace(/\/$/, "").split("/");
    if (parts.length <= 1) return;
    parts.pop();
    navigateTo(pane.id, parts.join("/") || "/");
  }

  function handleKeyDown(e) {
    if (!isActive) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, files().length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const f = files()[focusIdx()];
      if (f) openFile(f);
    } else if (e.key === "Backspace") {
      goUp();
    }
  }

  function handleContextMenu(e, file) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }

  const selectedCount = createMemo(() => pane.selected?.length || 0);
  const totalCount = createMemo(() => files().length);

  return (
    <div
      class="flex flex-col h-full outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={`background:var(--bg); ${isActive ? "outline:1px solid var(--accent);" : ""}`}
      onClick={() => { if (!isActive) {} }}
    >
      {/* File content area */}
      <div class="flex-1 overflow-hidden relative">
        <Show when={loading()}>
          <div class="flex items-center justify-center h-full" style="color:var(--muted)">
            Loading…
          </div>
        </Show>
        <Show when={error() && !loading()}>
          <div class="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <span style="color:var(--muted)">Could not read directory</span>
            <span class="text-xs" style="color:#666">{error()}</span>
          </div>
        </Show>
        <Show when={!loading()}>
          <Show
            when={viewMode() === "list"}
            fallback={
              <FileGrid
                files={files()}
                selected={pane.selected}
                onOpen={openFile}
                onSelect={(paths) => setSelection(pane.id, paths)}
                onContextMenu={handleContextMenu}
              />
            }
          >
            <FileList
              files={files()}
              selected={pane.selected}
              focusIdx={focusIdx()}
              onOpen={openFile}
              onSelect={(paths) => setSelection(pane.id, paths)}
              onFocusIdx={setFocusIdx}
              onContextMenu={handleContextMenu}
            />
          </Show>
        </Show>
      </div>

      {/* Status bar */}
      <div
        class="flex items-center justify-between px-3 shrink-0 text-xs"
        style="height:22px; border-top:1px solid var(--border); color:var(--muted); background:var(--panel)"
      >
        <span>{totalCount()} items</span>
        <span>{selectedCount() > 0 ? `${selectedCount()} selected` : ""}</span>
      </div>

      {/* Context menu */}
      <Show when={contextMenu()}>
        <ContextMenu
          x={contextMenu().x}
          y={contextMenu().y}
          file={contextMenu().file}
          pane={pane}
          onClose={() => setContextMenu(null)}
          onOpenProps={(f) => setPropsFile(f)}
        />
      </Show>

      {/* Properties panel */}
      <Show when={propsFile()}>
        <PropertiesPanel file={propsFile()} onClose={() => setPropsFile(null)} />
      </Show>
    </div>
  );
}
