import type { PointerEvent } from "react";

// Pointer and keyboard navigation share one active row, including portaled submenu items.
export const focusMenuItem = (event: PointerEvent<HTMLButtonElement>) => {
  const item = event.currentTarget;
  if (!item.disabled && item.ownerDocument.activeElement !== item) {
    item.focus({ preventScroll: true });
  }
};
