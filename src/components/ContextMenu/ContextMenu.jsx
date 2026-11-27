import { Show } from "solid-js";
import { openFile, openInTerminal, compressToZip, uncompressArchive, deleteFiles, shareViaImessage, copyFiles as tauriCopyFiles, moveFiles as tauriMoveFiles } from "../../lib/tauri";
import { copyFiles, cutFiles, clearClipboard, clipboardStore } from "../../stores/clipboardStore";

export default function ContextMenu(props) {
  const hasPaste = () => clipboardStore.paths.length > 0;
  const isZip = () => props.file?.name?.toLowerCase().endsWith(".zip");

  async function handlePaste() {
    if (!hasPaste()) return;
    try {
      if (clipboardStore.isCut) {
        await tauriMoveFiles(clipboardStore.paths, props.pane.path);
        clearClipboard();
      } else {
        await tauriCopyFiles(clipboardStore.paths, props.pane.path);
      }
    } catch (e) { console.error(e); }
    props.onClose();
  }

  async function handleDelete() {
    try { await deleteFiles([props.file.path]); } catch (e) { console.error(e); }
    props.onClose();
  }

  async function handleCompress() {
    try { await compressToZip([props.file.path], null); } catch (e) { console.error(e); }
    props.onClose();
  }

  async function handleUncompress() {
    try { await uncompressArchive(props.file.path, null); } catch (e) { console.error(e); }
    props.onClose();
  }

  async function handleShare() {
    try { await shareViaImessage(props.file.path); } catch (e) { console.error(e); }
    props.onClose();
  }

  const menuStyle = `
    position:fixed; left:${props.x}px; top:${props.y}px; z-index:100;
    background:var(--panel); border:1px solid var(--border);
    border-radius:6px; padding:4px 0; min-width:190px;
    box-shadow:0 8px 24px rgba(0,0,0,0.5);
  `;

  const itemClass = "flex items-center px-3 py-1.5 text-xs cursor-pointer transition-colors gap-2 fe-row";
  const itemStyle = "color:var(--text)";
  const sepStyle = "height:1px; margin:4px 0; background:var(--border)";

  return (
    <>
      <div class="fixed inset-0 z-50" onClick={props.onClose} />
      <div style={menuStyle} class="z-50">
        <div class={itemClass} style={itemStyle} onClick={() => { openFile(props.file.path); props.onClose(); }}>Open</div>
        <div class={itemClass} style={itemStyle} onClick={() => { openInTerminal(props.file.is_dir ? props.file.path : props.pane.path); props.onClose(); }}>Open in Terminal</div>
        <div style={sepStyle} />
        <div class={itemClass} style={itemStyle} onClick={() => { cutFiles([props.file.path]); props.onClose(); }}>Cut <span style="color:var(--muted); margin-left:auto">⌘X</span></div>
        <div class={itemClass} style={itemStyle} onClick={() => { copyFiles([props.file.path]); props.onClose(); }}>Copy <span style="color:var(--muted); margin-left:auto">⌘C</span></div>
        <Show when={hasPaste()}>
          <div class={itemClass} style={itemStyle} onClick={handlePaste}>Paste <span style="color:var(--muted); margin-left:auto">⌘V</span></div>
        </Show>
        <div style={sepStyle} />
        <div class={itemClass} style={itemStyle} onClick={() => { props.onRename?.(props.file); props.onClose(); }}>Rename <span style="color:var(--muted); margin-left:auto">F2</span></div>
        <div class={itemClass} style={itemStyle} onClick={handleDelete}>Move to Trash</div>
        <div style={sepStyle} />
        <div class={itemClass} style={itemStyle} onClick={handleCompress}>Compress to Zip</div>
        <Show when={isZip()}>
          <div class={itemClass} style={itemStyle} onClick={handleUncompress}>Uncompress Archive</div>
        </Show>
        <div style={sepStyle} />
        <div class={itemClass} style={itemStyle} onClick={() => { props.onOpenProps?.(props.file); props.onClose(); }}>Get Info <span style="color:var(--muted); margin-left:auto">⌘I</span></div>
        <div class={itemClass} style={itemStyle} onClick={handleShare}>Share via iMessage</div>
      </div>
    </>
  );
}
