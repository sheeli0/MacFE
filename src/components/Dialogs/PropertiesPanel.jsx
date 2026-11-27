import { createSignal, createEffect, Show } from "solid-js";
import { X, Copy, Archive, FolderArchive, Share } from "lucide-solid";
import { getFileMetadata, compressToZip, uncompressArchive, shareViaImessage } from "../../lib/tauri";
import FileIcon from "../FileView/FileIcon";

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

function formatSize(size, isDir) {
  if (isDir) return "—";
  const bytes = `${size.toLocaleString()} bytes`;
  if (size < 1024) return bytes;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB (${bytes})`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB (${bytes})`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB (${bytes})`;
}

export default function PropertiesPanel(props) {
  const [meta, setMeta] = createSignal(null);
  const [copied, setCopied] = createSignal(false);
  const [statusMsg, setStatusMsg] = createSignal("");

  createEffect(() => {
    const file = props.file;
    if (!file) return;
    getFileMetadata(file.path)
      .then(setMeta)
      .catch(() => setMeta(null));
  });

  function copyPath() {
    navigator.clipboard.writeText(props.file.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCompress() {
    try {
      const zipPath = await compressToZip([props.file.path], null);
      setStatusMsg(`Created ${zipPath.split("/").pop()}`);
      props.onRefresh?.();
    } catch (e) { console.error(e); }
  }

  async function handleUncompress() {
    try {
      const outDir = await uncompressArchive(props.file.path, null);
      setStatusMsg(`Extracted to ${outDir.split("/").pop()}`);
      props.onRefresh?.();
    } catch (e) { console.error(e); }
  }

  async function handleShare() {
    try { await shareViaImessage(props.file.path); } catch (e) { console.error(e); }
  }

  const isZip = () => props.file?.name?.toLowerCase().endsWith(".zip");

  const overlayStyle = `
    position:fixed; inset:0; z-index:60;
    display:flex; align-items:flex-end; justify-content:flex-end;
    pointer-events:none;
  `;
  const panelStyle = `
    pointer-events:all;
    width:310px; height:100%;
    background:var(--panel); border-left:1px solid var(--border);
    display:flex; flex-direction:column; overflow:hidden;
  `;

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        {/* Header */}
        <div class="flex items-center justify-between px-4 shrink-0" style="height:48px; border-bottom:1px solid var(--border)">
          <span class="text-sm font-medium" style="color:var(--text)">Info</span>
          <button class="fe-icon-btn" onClick={props.onClose}><X size={16} /></button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Icon + name */}
          <div class="flex flex-col items-center gap-2 py-2">
            <FileIcon file={props.file} size={48} />
            <span class="text-sm text-center font-medium" style="color:var(--text); word-break:break-all">{props.file.name}</span>
          </div>

          <Show when={meta()} fallback={<div style="color:var(--muted)" class="text-xs text-center">Loading…</div>}>
            {(m) => (
              <div class="flex flex-col gap-3">
                <Row label="Path">
                  <div class="flex items-center gap-1 min-w-0">
                    <span class="text-xs truncate flex-1" style="color:var(--text); font-family:monospace">{m().path}</span>
                    <button class="fe-icon-btn shrink-0" onClick={copyPath} title="Copy path">
                      {copied() ? <span class="text-xs" style="color:#7ec88a">✓</span> : <Copy size={12} />}
                    </button>
                  </div>
                </Row>

                <Row label="Kind">{m().mime_type || (m().is_dir ? "Folder" : "File")}</Row>
                <Row label="Size">{formatSize(m().size, m().is_dir)}</Row>
                <Row label="Permissions">{m().permissions}</Row>
                <Row label="Created">{formatDate(m().created)}</Row>
                <Row label="Modified">{formatDate(m().modified)}</Row>
                <Row label="Accessed">{formatDate(m().accessed)}</Row>
              </div>
            )}
          </Show>

          {/* Actions */}
          <div class="flex flex-col gap-2 mt-2">
            <button
              class="flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors fe-row"
              style="background:var(--bg); color:var(--text); border:1px solid var(--border)"
              onClick={handleCompress}
            >
              <Archive size={14} /> Compress to Zip
            </button>
            <Show when={isZip()}>
              <button
                class="flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors fe-row"
                style="background:var(--bg); color:var(--text); border:1px solid var(--border)"
                onClick={handleUncompress}
              >
                <FolderArchive size={14} /> Uncompress Archive
              </button>
            </Show>
            <button
              class="flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors fe-row"
              style="background:var(--bg); color:var(--text); border:1px solid var(--border)"
              onClick={handleShare}
            >
              <Share size={14} /> Share via iMessage
            </button>
            <Show when={statusMsg()}>
              <span class="text-xs" style="color:#7ec88a">{statusMsg()}</span>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row(props) {
  return (
    <div class="flex flex-col gap-0.5">
      <span class="text-xs uppercase tracking-wider" style="color:var(--muted)">{props.label}</span>
      <span class="text-xs" style="color:var(--text)">{props.children}</span>
    </div>
  );
}
