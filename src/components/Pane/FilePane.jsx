import { createSignal, createEffect, createMemo, Show } from "solid-js";
import {
  listDir,
  openFile as tauriOpenFile,
  copyFiles as tauriCopyFiles,
  moveFiles as tauriMoveFiles,
  deleteFiles as tauriDeleteFiles,
  renameFile as tauriRenameFile,
  createDir as tauriCreateDir,
  getFileMetadata,
  getGitBranch,
} from "../../lib/tauri";
import { windowStore, navigateTo, setSelection } from "../../stores/windowStore";
import { addRecent } from "../../stores/bookmarkStore";
import { clipboardStore, copyFiles, cutFiles, clearClipboard, syncClipboardFromBackend } from "../../stores/clipboardStore";
import FileList from "../FileView/FileList";
import FileGrid from "../FileView/FileGrid";
import ContextMenu from "../ContextMenu/ContextMenu";
import PropertiesPanel from "../Dialogs/PropertiesPanel";
import ConflictDialog from "../Dialogs/ConflictDialog";

export default function FilePane(props) {
  const pane = () => props.pane;
  const isActive = () => props.isActive;
  const [files, setFiles] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [contextMenu, setContextMenu] = createSignal(null);
  const [propsFile, setPropsFile] = createSignal(null);
  const [conflict, setConflict] = createSignal(null);
  const [focusIdx, setFocusIdx] = createSignal(-1);
  const [renamingPath, setRenamingPath] = createSignal(null);
  const [creatingFolder, setCreatingFolder] = createSignal(false);
  const [newFolderName, setNewFolderName] = createSignal("Untitled Folder");
  const [dragOver, setDragOver] = createSignal(false);
  const [gitBranch, setGitBranch] = createSignal(null);

  function refresh() {
    if (!pane().path) return;
    setLoading(true);
    setError(null);
    getGitBranch(pane().path).then(setGitBranch).catch(() => setGitBranch(null));
    listDir(pane().path)
      .then((entries) => {
        setFiles(entries || []);
        setLoading(false);
      })
      .catch((err) => {
        setFiles([]);
        setError(String(err));
        setLoading(false);
      });
  }

  createEffect(() => {
    if (isActive()) {
      window.__feOpenInfo = () => {
        const sel = pane().selected;
        if (sel && sel.length > 0) {
          const f = files().find((x) => x.path === sel[0]);
          if (f) setPropsFile(f);
        }
      };
      window.__feNewFolder = () => {
        setNewFolderName("Untitled Folder");
        setCreatingFolder(true);
      };
    }
  });

  createEffect(() => {
    const path = pane().path;
    if (!path) return;
    addRecent(path);
    refresh();
  });

  const visibleFiles = createMemo(() => {
    const list = files();
    return windowStore.showHidden ? list : list.filter((f) => !f.is_hidden);
  });

  function openEntry(file) {
    if (file.is_dir) {
      navigateTo(pane().id, file.path);
    } else {
      tauriOpenFile(file.path).catch(console.error);
    }
  }

  function goUp() {
    const parts = pane().path.replace(/\/$/, "").split("/");
    if (parts.length <= 1) return;
    parts.pop();
    navigateTo(pane().id, parts.join("/") || "/");
  }

  async function pasteSources(sources, isCut) {
    if (!sources.length) return;
    const existingMap = new Map(files().map((f) => [f.name, f]));

    const nonConflicting = [];
    const conflicts = [];
    for (const src of sources) {
      const name = src.split("/").filter(Boolean).pop();
      if (existingMap.has(name)) {
        let incomingMeta = { name, path: src, size: 0, modified: 0 };
        try {
          const m = await getFileMetadata(src);
          incomingMeta = { name: m.name, path: m.path, size: m.size, modified: m.modified };
        } catch {}
        conflicts.push({ src, existing: existingMap.get(name), incoming: incomingMeta });
      } else {
        nonConflicting.push(src);
      }
    }

    if (nonConflicting.length > 0) {
      if (isCut) await tauriMoveFiles(nonConflicting, pane().path);
      else await tauriCopyFiles(nonConflicting, pane().path);
    }

    let applyAllAction = null;
    for (const item of conflicts) {
      let action = applyAllAction;
      if (!action) {
        const res = await new Promise((resolve) => {
          setConflict({
            existing: item.existing,
            incoming: item.incoming,
            resolve,
          });
        });
        setConflict(null);
        action = res.action;
        if (res.applyToAll) applyAllAction = action;
        if (action === "rename_incoming" && res.newName) {
          const renamed = await tauriRenameFile(item.src, res.newName);
          if (isCut) await tauriMoveFiles([renamed], pane().path);
          else await tauriCopyFiles([renamed], pane().path);
          continue;
        }
        if (action === "rename_existing" && res.newName) {
          await tauriRenameFile(item.existing.path, res.newName);
          if (isCut) await tauriMoveFiles([item.src], pane().path);
          else await tauriCopyFiles([item.src], pane().path);
          continue;
        }
      }
      if (action === "replace") {
        if (isCut) await tauriMoveFiles([item.src], pane().path);
        else await tauriCopyFiles([item.src], pane().path);
      } else if (action === "keep_both") {
        const dot = item.incoming.name.lastIndexOf(".");
        const newName = dot > 0
          ? `${item.incoming.name.slice(0, dot)} (copy)${item.incoming.name.slice(dot)}`
          : `${item.incoming.name} (copy)`;
        const renamed = await tauriRenameFile(item.src, newName);
        if (isCut) await tauriMoveFiles([renamed], pane().path);
        else await tauriCopyFiles([renamed], pane().path);
      }
    }

    if (isCut) clearClipboard();
    refresh();
  }

  async function pasteHere() {
    await syncClipboardFromBackend();
    await pasteSources(clipboardStore.paths, clipboardStore.isCut);
  }

  async function commitRename(file, newName) {
    setRenamingPath(null);
    const trimmed = newName.trim();
    if (!trimmed || trimmed === file.name) return;
    try {
      await tauriRenameFile(file.path, trimmed);
      refresh();
    } catch (e) { console.error(e); }
  }

  async function commitNewFolder() {
    const name = newFolderName().trim();
    setCreatingFolder(false);
    if (!name) return;
    const base = pane().path === "/" ? "" : pane().path.replace(/\/$/, "");
    try {
      await tauriCreateDir(`${base}/${name}`);
      refresh();
    } catch (e) { console.error(e); }
  }

  function handleDragOver(e) {
    if (e.dataTransfer?.types?.includes("application/x-fe-paths")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
      setDragOver(true);
    }
  }

  async function handleDrop(e) {
    setDragOver(false);
    const raw = e.dataTransfer?.getData("application/x-fe-paths");
    if (!raw) return;
    e.preventDefault();
    try {
      const { paths, sourcePaneId } = JSON.parse(raw);
      if (!paths?.length) return;
      if (sourcePaneId === pane().id && !e.altKey) return;
      await pasteSources(paths, !e.altKey);
    } catch (err) { console.error(err); }
  }

  function handleKeyDown(e) {
    if (!isActive()) return;
    if (e.key === "F2") {
      const sel = pane().selected;
      if (sel?.length === 1) {
        e.preventDefault();
        setRenamingPath(sel[0]);
      }
    } else if (e.metaKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setSelection(pane().id, visibleFiles().map((f) => f.path));
    } else if (e.metaKey && e.key.toLowerCase() === "c") {
      if (pane().selected?.length) { e.preventDefault(); copyFiles(pane().selected); }
    } else if (e.metaKey && e.key.toLowerCase() === "x") {
      if (pane().selected?.length) { e.preventDefault(); cutFiles(pane().selected); }
    } else if (e.metaKey && e.key.toLowerCase() === "v") {
      e.preventDefault();
      pasteHere().catch(console.error);
    } else if (e.metaKey && e.key === "Backspace") {
      if (pane().selected?.length) {
        e.preventDefault();
        tauriDeleteFiles(pane().selected).then(refresh).catch(console.error);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, visibleFiles().length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const f = visibleFiles()[focusIdx()];
      if (f) openEntry(f);
    } else if (e.key === "Backspace") {
      goUp();
    }
  }

  function handleContextMenu(e, file) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }

  const cutPaths = createMemo(() => (clipboardStore.isCut ? clipboardStore.paths : []));
  const selectedCount = createMemo(() => pane().selected?.length || 0);
  const totalCount = createMemo(() => visibleFiles().length);

  return (
    <div
      class="flex flex-col h-full outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={`background:var(--bg); ${dragOver() ? "outline:2px dashed var(--accent); outline-offset:-2px;" : isActive() ? "box-shadow: inset 0 1px 0 0 var(--accent);" : ""}`}
    >
      {/* Inline New Folder bar */}
      <Show when={creatingFolder()}>
        <div class="flex items-center gap-2 px-3 py-1.5 shrink-0" style="background:var(--panel); border-bottom:1px solid var(--border)">
          <span class="text-xs" style="color:var(--muted)">New Folder:</span>
          <input
            class="flex-1 px-2 py-0.5 text-xs"
            value={newFolderName()}
            onInput={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitNewFolder();
              if (e.key === "Escape") setCreatingFolder(false);
            }}
            ref={(el) => setTimeout(() => { el?.focus(); el?.select(); }, 0)}
          />
          <button class="px-2 py-0.5 rounded text-xs" style="background:var(--accent); color:#fff" onClick={commitNewFolder}>Create</button>
          <button class="px-2 py-0.5 rounded text-xs" style="color:var(--muted)" onClick={() => setCreatingFolder(false)}>Cancel</button>
        </div>
      </Show>

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
        <Show when={!loading() && !error()}>
          <Show
            when={pane().viewMode !== "grid"}
            fallback={
              <FileGrid
                files={visibleFiles()}
                paneId={pane().id}
                selected={pane().selected}
                cutPaths={cutPaths()}
                onOpen={openEntry}
                onSelect={(paths) => setSelection(pane().id, paths)}
                onContextMenu={handleContextMenu}
              />
            }
          >
            <FileList
              files={visibleFiles()}
              paneId={pane().id}
              selected={pane().selected}
              cutPaths={cutPaths()}
              focusIdx={focusIdx()}
              renamingPath={renamingPath()}
              onOpen={openEntry}
              onSelect={(paths) => setSelection(pane().id, paths)}
              onFocusIdx={setFocusIdx}
              onContextMenu={handleContextMenu}
              onCommitRename={commitRename}
              onCancelRename={() => setRenamingPath(null)}
            />
          </Show>
        </Show>
      </div>

      {/* Status bar */}
      <div
        class="flex items-center justify-between px-3 shrink-0 text-[11px]"
        style="height:24px; border-top:1px solid var(--border); color:var(--muted); background:var(--panel)"
      >
        <div class="flex items-center gap-2">
          <span>{totalCount()} items</span>
          <Show when={gitBranch()}>
            <span class="px-1.5 py-0.2 rounded text-[10px]" style="background:var(--bg); color:var(--accent); border:1px solid var(--border)">
              git: {gitBranch()}
            </span>
          </Show>
        </div>
        <span>{selectedCount() > 0 ? `${selectedCount()} selected` : ""}</span>
      </div>

      {/* Context menu */}
      <Show when={contextMenu()}>
        <ContextMenu
          x={contextMenu().x}
          y={contextMenu().y}
          file={contextMenu().file}
          pane={pane()}
          onClose={() => { setContextMenu(null); refresh(); }}
          onOpenProps={(f) => setPropsFile(f)}
          onRename={(f) => setRenamingPath(f.path)}
        />
      </Show>

      {/* Properties panel */}
      <Show when={propsFile()}>
        <PropertiesPanel file={propsFile()} onClose={() => setPropsFile(null)} onRefresh={refresh} />
      </Show>

      {/* Conflict dialog */}
      <Show when={conflict()}>
        {(c) => {
          const [applyAll, setApplyAll] = createSignal(false);
          return (
            <ConflictDialog
              existing={c().existing}
              incoming={c().incoming}
              applyToAll={applyAll()}
              onApplyToAll={setApplyAll}
              onReplace={() => c().resolve({ action: "replace", applyToAll: applyAll() })}
              onKeepBoth={() => c().resolve({ action: "keep_both", applyToAll: applyAll() })}
              onRenameIncoming={(newName) => c().resolve({ action: "rename_incoming", newName, applyToAll: applyAll() })}
              onRenameExisting={(newName) => c().resolve({ action: "rename_existing", newName, applyToAll: applyAll() })}
              onSkip={() => c().resolve({ action: "skip", applyToAll: applyAll() })}
            />
          );
        }}
      </Show>
    </div>
  );
}
