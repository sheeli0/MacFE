import { createSignal, Show } from "solid-js";
import Toolbar from "./Toolbar/Toolbar";
import Sidebar from "./Sidebar/Sidebar";
import PaneContainer from "./Pane/PaneContainer";
import SearchOverlay from "./Search/SearchOverlay";
import PreviewPane from "./Preview/PreviewPane";
import { windowStore } from "../stores/windowStore";

export default function AppShell() {
  const [searchOpen, setSearchOpen] = createSignal(false);

  window.__feOpenSearch = () => setSearchOpen(true);

  return (
    <div class="flex flex-col w-full h-full" style="background: var(--bg)">
      <Toolbar onSearch={() => setSearchOpen(true)} />
      <div class="flex flex-1 overflow-hidden">
        <Sidebar />
        <PaneContainer />
        <Show when={windowStore.previewOpen}>
          <PreviewPane />
        </Show>
      </div>
      {searchOpen() && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
