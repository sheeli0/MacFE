import { For } from "solid-js";
import { windowStore, setActivePaneId } from "../../stores/windowStore";
import FilePane from "./FilePane";

export default function PaneContainer() {
  return (
    <div class="flex flex-1 overflow-hidden">
      <For each={windowStore.panes}>
        {(pane, i) => (
          <>
            {i() > 0 && (
              <div class="w-px shrink-0" style="background:var(--border)" />
            )}
            <div
              class="flex-1 overflow-hidden"
              onClick={() => setActivePaneId(pane.id)}
            >
              <FilePane pane={pane} isActive={windowStore.activePane === i()} />
            </div>
          </>
        )}
      </For>
    </div>
  );
}
