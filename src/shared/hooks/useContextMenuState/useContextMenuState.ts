import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { KEY } from "@/shared/constants";
import { HOTKEY_SCOPE, useHotkey, useHotkeyScope } from "@/shared/keymap";

import { VIEWPORT_PADDING } from "./constants";

// Generic context-menu state: visibility, the targeted payload, and positioning. Closes on an
// outside press or Escape, and clamps itself inside the viewport. `T` is whatever the caller needs
// to know which thing the menu is open for (e.g. a sidebar item, a volume path).
export const useContextMenuState = <T>() => {
  const ref = useRef<HTMLDivElement>(null);
  // What had focus before the menu opened, restored when it closes (the menu moves focus to its
  // first item while open — see ContextMenu).
  const triggerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<T | null>(null);

  const close = () => setVisible(false);

  // Restore focus to the trigger whenever the menu goes from open to closed.
  useEffect(() => {
    if (visible) return;
    triggerRef.current?.focus?.();
    triggerRef.current = null;
  }, [visible]);

  // Close on a press outside the menu. Deferred a tick so the very gesture that opened the menu
  // (whose trailing mousedown lands outside) doesn't immediately close it.
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

  // Close on Escape in the MENU scope, so it doesn't also trigger lower-scope handlers.
  useHotkeyScope(HOTKEY_SCOPE.MENU, visible);
  useHotkey({ keys: [KEY.ESCAPE] }, () => setVisible(false), {
    scope: HOTKEY_SCOPE.MENU,
    when: visible,
  });

  // Keep the menu inside the viewport once it has rendered with its final content.
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
  }, [visible, payload]);

  // Open the menu at a screen position for a given payload.
  const openAt = (x: number, y: number, next: T) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setPayload(next);
    if (ref.current) {
      ref.current.style.left = `${x}px`;
      ref.current.style.top = `${y}px`;
    }
    setVisible(true);
  };

  return { ref, visible, payload, openAt, close };
};
