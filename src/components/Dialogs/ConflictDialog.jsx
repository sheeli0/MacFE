import { createSignal, Show } from "solid-js";
import { X } from "lucide-solid";

export default function ConflictDialog({ existing, incoming, onReplace, onKeepBoth, onRenameIncoming, onRenameExisting, onSkip, applyToAll, onApplyToAll }) {
  const [renamingIncoming, setRenamingIncoming] = createSignal(false);
  const [renamingExisting, setRenamingExisting] = createSignal(false);
  const [nameVal, setNameVal] = createSignal("");

  function formatDate(ms) {
    return ms ? new Date(ms).toLocaleDateString() : "—";
  }
  function formatSize(size) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  const overlayStyle = `
    position:fixed; inset:0; z-index:200;
    display:flex; align-items:center; justify-content:center;
    background:rgba(0,0,0,0.65);
  `;
  const panelStyle = `
    background:var(--panel); border:1px solid var(--border);
    border-radius:8px; padding:24px; width:480px; max-width:95vw;
    display:flex; flex-direction:column; gap:16px;
  `;

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold" style="color:var(--text)">File Conflict</span>
          <button class="fe-icon-btn" onClick={onSkip}><X size={16} /></button>
        </div>

        <p class="text-xs" style="color:var(--muted)">
          A file named <strong style="color:var(--text)">{incoming?.name}</strong> already exists in this location.
        </p>

        {/* Side-by-side cards */}
        <div class="flex gap-3">
          <FileCard label="Existing" file={existing} formatDate={formatDate} formatSize={formatSize} />
          <FileCard label="Incoming" file={incoming} formatDate={formatDate} formatSize={formatSize} />
        </div>

        {/* Rename inputs */}
        <Show when={renamingIncoming()}>
          <div class="flex gap-2">
            <input
              class="flex-1 px-2 py-1 rounded text-xs outline-none"
              style="background:var(--bg); border:1px solid var(--border); color:var(--text)"
              placeholder="New name for incoming file…"
              value={nameVal()}
              onInput={(e) => setNameVal(e.target.value)}
              ref={el => setTimeout(() => el?.focus(), 0)}
            />
            <button
              class="px-3 py-1 rounded text-xs"
              style="background:var(--accent); color:#fff"
              onClick={() => { onRenameIncoming(nameVal()); setRenamingIncoming(false); }}
            >OK</button>
          </div>
        </Show>
        <Show when={renamingExisting()}>
          <div class="flex gap-2">
            <input
              class="flex-1 px-2 py-1 rounded text-xs outline-none"
              style="background:var(--bg); border:1px solid var(--border); color:var(--text)"
              placeholder="New name for existing file…"
              value={nameVal()}
              onInput={(e) => setNameVal(e.target.value)}
              ref={el => setTimeout(() => el?.focus(), 0)}
            />
            <button
              class="px-3 py-1 rounded text-xs"
              style="background:var(--accent); color:#fff"
              onClick={() => { onRenameExisting(nameVal()); setRenamingExisting(false); }}
            >OK</button>
          </div>
        </Show>

        {/* Action buttons */}
        <div class="flex flex-wrap gap-2">
          <Btn onClick={onReplace} accent>Replace</Btn>
          <Btn onClick={onKeepBoth}>Keep Both</Btn>
          <Btn onClick={() => { setNameVal(incoming?.name || ""); setRenamingIncoming(true); setRenamingExisting(false); }}>Rename Incoming</Btn>
          <Btn onClick={() => { setNameVal(existing?.name || ""); setRenamingExisting(true); setRenamingIncoming(false); }}>Rename Existing</Btn>
          <Btn onClick={onSkip}>Skip</Btn>
        </div>

        {/* Apply to all */}
        <label class="flex items-center gap-2 cursor-pointer text-xs" style="color:var(--muted)">
          <input type="checkbox" checked={applyToAll} onChange={(e) => onApplyToAll?.(e.target.checked)} />
          Apply to all conflicts
        </label>
      </div>
    </div>
  );
}

function FileCard({ label, file, formatDate, formatSize }) {
  return (
    <div class="flex-1 rounded p-3 flex flex-col gap-1" style="background:var(--bg); border:1px solid var(--border)">
      <span class="text-xs uppercase tracking-wider" style="color:var(--muted)">{label}</span>
      <span class="text-xs font-medium truncate" style="color:var(--text)">{file?.name}</span>
      <span class="text-xs" style="color:var(--muted)">{file ? formatSize(file.size) : "—"}</span>
      <span class="text-xs" style="color:var(--muted)">{file ? formatDate(file.modified) : "—"}</span>
    </div>
  );
}

function Btn({ children, onClick, accent }) {
  return (
    <button
      class="px-3 py-1 rounded text-xs transition-colors"
      style={accent
        ? "background:var(--accent);color:#fff"
        : "background:var(--bg);color:var(--text);border:1px solid var(--border)"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
