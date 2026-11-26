import { createSignal, createMemo, For } from "solid-js";
import { windowStore, navigateTo } from "../../stores/windowStore";

export default function PathBar() {
  const [editing, setEditing] = createSignal(false);
  const [inputVal, setInputVal] = createSignal("");

  const activePane = createMemo(() => windowStore.panes[windowStore.activePane]);
  const currentPath = createMemo(() => activePane()?.path || "/");

  const segments = createMemo(() => {
    const parts = currentPath().split("/").filter(Boolean);
    return parts.map((part, i) => ({
      name: part,
      path: "/" + parts.slice(0, i + 1).join("/"),
    }));
  });

  function startEdit() {
    setInputVal(currentPath());
    setEditing(true);
  }

  function commitEdit() {
    const p = activePane();
    if (p && inputVal().trim()) {
      navigateTo(p.id, inputVal().trim());
    }
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function navigateSegment(path) {
    const p = activePane();
    if (p) navigateTo(p.id, path);
  }

  return (
    <div
      class="flex items-center w-full px-2 rounded"
      style="height:32px; background:var(--bg); border:1px solid var(--border)"
    >
      {editing() ? (
        <input
          class="w-full bg-transparent outline-none border-none text-xs"
          style="color:var(--text)"
          value={inputVal()}
          onInput={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") cancelEdit();
          }}
          onBlur={cancelEdit}
          ref={(el) => setTimeout(() => el?.focus(), 0)}
        />
      ) : (
        <div
          class="flex items-center gap-0.5 w-full cursor-text overflow-hidden"
          onClick={startEdit}
        >
          <span
            class="text-xs cursor-pointer hover:text-[#4f8ef7] transition-colors shrink-0"
            style="color:var(--muted)"
            onClick={(e) => { e.stopPropagation(); navigateSegment("/"); }}
          >
            /
          </span>
          <For each={segments()}>
            {(seg, i) => (
              <>
                <span
                  class="text-xs cursor-pointer hover:text-[#4f8ef7] transition-colors truncate max-w-32"
                  style="color:var(--text)"
                  onClick={(e) => { e.stopPropagation(); navigateSegment(seg.path); }}
                >
                  {seg.name}
                </span>
                {i() < segments().length - 1 && (
                  <span class="text-xs shrink-0" style="color:var(--muted)">/</span>
                )}
              </>
            )}
          </For>
        </div>
      )}
    </div>
  );
}
