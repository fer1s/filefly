import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ENTRY_KIND, KEY, type EntryKind } from "@/shared/constants";

// Gap (px) kept between the menu and the viewport edges when clamping.
const VIEWPORT_PADDING = 8;

// Context-menu state: visibility, the targeted element (id + type) and positioning.
// Closes itself when clicking outside.
export const useContextMenu = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [elementID, setElementID] = useState("");
  const [elementType, setElementType] = useState<EntryKind>(ENTRY_KIND.NONE);

  // Close on a press outside the menu. Registered only while open and deferred a tick so
  // the very gesture that opened the menu (whose trailing click/mousedown lands outside)
  // doesn't immediately close it. Listening on `mousedown` (not `click`) also avoids the
  // synthetic click some webviews emit alongside a right-click, which closed the menu the
  // instant it opened.
  useEffect(() => {
    if (!visible) return;

    const handleClose = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setVisible(false);
    };

    const id = window.setTimeout(
      () => document.addEventListener("mousedown", handleClose),
      0,
    );

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", handleClose);
    };
  }, [visible]);

  // Close on Escape. Capture phase + stopPropagation so the menu closes without also
  // triggering the directory's Escape handler (which clears the selection).
  useEffect(() => {
    if (!visible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== KEY.ESCAPE) return;
      e.stopPropagation();
      setVisible(false);
    };

    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [visible]);

  // Keep the menu inside the viewport. Runs after the menu (re)renders with its final
  // content, so its measured size is correct. offsetWidth/Height ignore the open-animation
  // transform, so clamping isn't thrown off by the scale transition.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;

    const x = parseFloat(el.style.left) || 0;
    const y = parseFloat(el.style.top) || 0;
    const maxX = window.innerWidth - el.offsetWidth - VIEWPORT_PADDING;
    const maxY = window.innerHeight - el.offsetHeight - VIEWPORT_PADDING;

    const clampedX = Math.max(VIEWPORT_PADDING, Math.min(x, maxX));
    const clampedY = Math.max(VIEWPORT_PADDING, Math.min(y, maxY));

    if (clampedX !== x) el.style.left = `${clampedX}px`;
    if (clampedY !== y) el.style.top = `${clampedY}px`;
  }, [visible, elementID, elementType]);

  // Open the menu at a screen position for a given element.
  const openAt = (x: number, y: number, id: string, type: EntryKind) => {
    setElementID(id);
    setElementType(type);
    if (ref.current) {
      ref.current.style.left = `${x}px`;
      ref.current.style.top = `${y}px`;
    }
    setVisible(true);
  };

  return {
    ref,
    visible,
    setVisible,
    elementID,
    setElementID,
    elementType,
    setElementType,
    openAt,
  };
};
