import { Show } from "solid-js";
import { openFile, openInTerminal, compressToZip, deleteFiles, shareViaImessage, copyFiles as tauriCopyFiles, moveFiles as tauriMoveFiles } from "../../lib/tauri";
import { copyFiles, cutFiles, clearClipboard, clipboardStore } from "../../stores/clipboardStore";

export default function ContextMenu({ x, y, file, pane, onClose, onOpenProps }) {
  const hasPaste = () => clipboardStore.paths.length > 0;

  async function handlePaste() {
    if (!hasPaste()) return;
    try {
      if (clipboardStore.isCut) {
        await tauriMoveFiles(clipboardStore.paths, pane.path);
        clearClipboard();
      } else {
        await tauriCopyFiles(clipboardStore.paths, pane.path);
      }
    } catch (e) { console.error(e); }
    onClose();
  }

  async function handleDelete() {
    try { await deleteFiles([file.path]); } catch (e) { console.error(e); }
    onClose();
  }

  async function handleCompress() {
    try { await compressToZip([file.path], null); } catch (e) { console.error(e); }
    onClose();
  }

  async function handleShare() {
    try { await shareViaImessage(file.path); } catch (e) { console.error(e); }
    onClose();
  }

  const menuStyle = `
    position:fixed; left:${x}px; top:${y}px; z-index:100;
    background:var(--panel); border:1px solid var(--border);
    border-radius:6px; padding:4px 0; min-width:180px;
    box-shadow:0 8px 24px rgba(0,0,0,0.5);
  `;

  const itemClass = "flex items-center px-3 py-1.5 text-xs cursor-pointer transition-colors gap-2 fe-row";
  const itemStyle = "color:var(--text)";
  const sepStyle = "height:1px; margin:4px 0; background:var(--border)";

  return (
    <>
      <div class="fixed inset-0 z-50" onClick={onClose} />
      <div style={menuStyle} class="z-50">
        <div class={itemClass} style={itemStyle} onClick={() => { openFile(file.path); onClose(); }}>Open</div>
        {!file.is_dir && <div class={itemClass} style={itemStyle} onClick={() => { openInTerminal(file.path); onClose(); }}>Open in Terminal</div>}
        <div style={sepStyle} />
        <div class={itemClass} style={itemStyle} onClick={() => { cutFiles([file.path]); onClose(); }}>Cut <span style="color:var(--muted); margin-left:auto">⌘X</span></div>
        <div class={itemClass} style={itemStyle} onClick={() => { copyFiles([file.path]); onClose(); }}>Copy <span style="color:var(--muted); margin-left:auto">⌘C</span></div>
        <Show when={hasPaste()}>
          <div class={itemClass} style={itemStyle} onClick={handlePaste}>Paste <span style="color:var(--muted); margin-left:auto">⌘V</span></div>
        </Show>
        <div style={sepStyle} />
        <div class={itemClass} style={itemStyle} onClick={handleDelete}>Delete</div>
        <div style={sepStyle} />
        <div class={itemClass} style={itemStyle} onClick={handleCompress}>Compress to Zip</div>
        <div style={sepStyle} />
        <div class={itemClass} style={itemStyle} onClick={() => { onOpenProps?.(file); onClose(); }}>Get Info <span style="color:var(--muted); margin-left:auto">⌘I</span></div>
        <div class={itemClass} style={itemStyle} onClick={handleShare}>Share via iMessage</div>
      </div>
    </>
  );
}
