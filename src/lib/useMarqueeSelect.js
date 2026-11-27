import { createSignal, onCleanup } from "solid-js";

/**
 * Reusable rubber-band (marquee) drag-selection hook for file list & grid views.
 */
export function useMarqueeSelect({ getContainer, getSelected, onSelect }) {
  const [marquee, setMarquee] = createSignal(null); // { left, top, width, height } relative to container
  let suppressNextClick = false;

  function onMouseDown(e) {
    if (e.button !== 0) return;
    const container = getContainer();
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = e.clientX - rect.left + container.scrollLeft;
    const startY = e.clientY - rect.top + container.scrollTop;
    const initialSelection = e.metaKey ? [...(getSelected() || [])] : [];
    const additive = e.metaKey;
    let dragging = false;

    function updateSelection(curClientX, curClientY) {
      const cRect = container.getBoundingClientRect();
      const curX = curClientX - cRect.left + container.scrollLeft;
      const curY = curClientY - cRect.top + container.scrollTop;

      const left = Math.min(startX, curX);
      const top = Math.min(startY, curY);
      const width = Math.abs(curX - startX);
      const height = Math.abs(curY - startY);
      setMarquee({ left, top, width, height });

      const vLeft = Math.min(startClientX, curClientX);
      const vRight = Math.max(startClientX, curClientX);
      const vTop = Math.min(startClientY, curClientY);
      const vBottom = Math.max(startClientY, curClientY);

      const items = container.querySelectorAll("[data-file-path]");
      const hit = new Set(additive ? initialSelection : []);
      for (const el of items) {
        const r = el.getBoundingClientRect();
        const intersects =
          r.right >= vLeft &&
          r.left <= vRight &&
          r.bottom >= vTop &&
          r.top <= vBottom;
        if (intersects) {
          hit.add(el.getAttribute("data-file-path"));
        }
      }
      onSelect?.(Array.from(hit));
    }

    function onMouseMove(moveEvt) {
      const dx = moveEvt.clientX - startClientX;
      const dy = moveEvt.clientY - startClientY;
      if (!dragging && Math.hypot(dx, dy) > 4) {
        dragging = true;
      }
      if (dragging) {
        moveEvt.preventDefault();
        updateSelection(moveEvt.clientX, moveEvt.clientY);
      }
    }

    function onMouseUp(upEvt) {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (dragging) {
        suppressNextClick = true;
        setTimeout(() => { suppressNextClick = false; }, 0);
        setMarquee(null);
      } else if (!upEvt.target.closest?.("[data-file-path]") && !additive) {
        onSelect?.([]);
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    onCleanup(() => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    });
  }

  function consumeSuppressClick() {
    if (suppressNextClick) {
      suppressNextClick = false;
      return true;
    }
    return false;
  }

  return { marquee, onMouseDown, consumeSuppressClick };
}
