import { createSignal, createEffect, createMemo, Show } from "solid-js";
import { X, FileText } from "lucide-solid";
import { windowStore, togglePreview } from "../../stores/windowStore";
import { readFilePreview, getFileMetadata } from "../../lib/tauri";

export default function PreviewPane() {
  const [preview, setPreview] = createSignal(null);
  const [meta, setMeta] = createSignal(null);
  const [loading, setLoading] = createSignal(false);

  const selectedPath = createMemo(() => {
    const active = windowStore.panes[windowStore.activePane];
    return active?.selected?.[0] || null;
  });

  createEffect(() => {
    const path = selectedPath();
    if (!path) {
      setPreview(null);
      setMeta(null);
      return;
    }
    setLoading(true);
    Promise.all([
      getFileMetadata(path).catch(() => null),
      readFilePreview(path, 65536).catch(() => null),
    ]).then(([m, p]) => {
      setMeta(m);
      setPreview(p);
      setLoading(false);
    });
  });

  return (
    <div
      class="flex flex-col shrink-0 overflow-hidden"
      style="width:300px; background:var(--panel-alt); border-left:1px solid var(--border)"
    >
      <div
        class="flex items-center justify-between px-3 shrink-0"
        style="height:32px; background:var(--panel); border-bottom:1px solid var(--border)"
      >
        <span class="text-[11px] font-semibold uppercase tracking-wider" style="color:var(--muted)">
          Preview
        </span>
        <button class="fe-icon-btn w-5 h-5" onClick={togglePreview} title="Close Preview">
          <X size={12} />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <Show
          when={selectedPath()}
          fallback={
            <div class="flex flex-col items-center justify-center h-full gap-2" style="color:var(--muted)">
              <FileText size={28} />
              <span class="text-xs">Select a file to preview</span>
            </div>
          }
        >
          <Show when={loading()}>
            <div class="text-xs text-center py-6" style="color:var(--muted)">Loading preview…</div>
          </Show>
          <Show when={!loading() && meta()}>
            {(m) => (
              <div class="flex flex-col gap-3">
                <div>
                  <div class="text-xs font-semibold truncate" style="color:var(--text)">{m().name}</div>
                  <div class="text-[11px]" style="color:var(--muted)">
                    {m().is_dir ? "Folder" : `${m().size_human} • ${m().mime_type || "File"}`}
                  </div>
                </div>

                <Show when={preview()?.kind === "image"}>
                  <div class="rounded overflow-hidden border" style="border-color:var(--border); background:var(--bg)">
                    <img src={preview().content} alt={m().name} class="w-full h-auto max-h-64 object-contain" />
                  </div>
                </Show>

                <Show when={preview()?.kind === "text"}>
                  <pre
                    class="text-[11px] leading-relaxed p-2.5 rounded overflow-x-auto"
                    style="background:var(--bg); border:1px solid var(--border); color:var(--text); font-family:ui-monospace, SFMono-Regular, Menlo, monospace; max-height:460px"
                  >
                    {preview().content}
                  </pre>
                  <Show when={preview().truncated}>
                    <span class="text-[11px]" style="color:var(--muted)">Showing first 64 KB</span>
                  </Show>
                </Show>

                <Show when={preview()?.kind === "binary"}>
                  <div class="text-xs p-3 rounded" style="background:var(--bg); color:var(--muted); border:1px solid var(--border)">
                    {preview().content}
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </Show>
      </div>
    </div>
  );
}
