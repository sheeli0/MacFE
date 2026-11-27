import { createSignal, Show } from "solid-js";
import { X } from "lucide-solid";
import { formatSize, formatDate } from "../../lib/format";

export default function ConflictDialog(props) {
  const [renamingIncoming, setRenamingIncoming] = createSignal(false);
  const [renamingExisting, setRenamingExisting] = createSignal(false);
  const [nameVal, setNameVal] = createSignal("");

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
          <button class="fe-icon-btn" onClick={props.onSkip}><X size={16} /></button>
        </div>

        <p class="text-xs" style="color:var(--muted)">
          A file named <strong style="color:var(--text)">{props.incoming?.name}</strong> already exists in this location.
        </p>

        {/* Side-by-side cards */}
        <div class="flex gap-3">
          <FileCard label="Existing" file={props.existing} />
          <FileCard label="Incoming" file={props.incoming} />
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
              onClick={() => { props.onRenameIncoming(nameVal()); setRenamingIncoming(false); }}
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
              onClick={() => { props.onRenameExisting(nameVal()); setRenamingExisting(false); }}
            >OK</button>
          </div>
        </Show>

        {/* Action buttons */}
        <div class="flex flex-wrap gap-2">
          <Btn onClick={props.onReplace} accent>Replace</Btn>
          <Btn onClick={props.onKeepBoth}>Keep Both</Btn>
          <Btn onClick={() => { setNameVal(props.incoming?.name || ""); setRenamingIncoming(true); setRenamingExisting(false); }}>Rename Incoming</Btn>
          <Btn onClick={() => { setNameVal(props.existing?.name || ""); setRenamingExisting(true); setRenamingIncoming(false); }}>Rename Existing</Btn>
          <Btn onClick={props.onSkip}>Skip</Btn>
        </div>

        {/* Apply to all */}
        <label class="flex items-center gap-2 cursor-pointer text-xs" style="color:var(--muted)">
          <input type="checkbox" checked={props.applyToAll} onChange={(e) => props.onApplyToAll?.(e.target.checked)} />
          Apply to all conflicts
        </label>
      </div>
    </div>
  );
}

function FileCard(props) {
  return (
    <div class="flex-1 rounded p-3 flex flex-col gap-1" style="background:var(--bg); border:1px solid var(--border)">
      <span class="text-xs uppercase tracking-wider" style="color:var(--muted)">{props.label}</span>
      <span class="text-xs font-medium truncate" style="color:var(--text)">{props.file?.name}</span>
      <span class="text-xs" style="color:var(--muted)">{props.file ? formatSize(props.file.size) : "—"}</span>
      <span class="text-xs" style="color:var(--muted)">{props.file ? formatDate(props.file.modified) : "—"}</span>
    </div>
  );
}

function Btn(props) {
  return (
    <button
      class="px-3 py-1 rounded text-xs transition-colors"
      style={props.accent
        ? "background:var(--accent);color:#fff"
        : "background:var(--bg);color:var(--text);border:1px solid var(--border)"}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
