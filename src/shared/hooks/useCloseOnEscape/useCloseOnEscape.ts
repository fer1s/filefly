import { useEffect } from "react";

import { KEY } from "@/shared/constants";

// Shared LIFO stack of active Escape handlers. Only the topmost (most recently opened) one fires,
// and it stops the event so background handlers (directory selection, sidebar edit mode, …) don't
// also react. The single listener is on `window` in the capture phase so it runs before the
// document-level capture handlers used elsewhere (e.g. useKeyboardNav clearing the selection).
const handlers: Array<() => void> = [];
let listening = false;

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== KEY.ESCAPE || handlers.length === 0) return;
  event.preventDefault();
  event.stopPropagation();
  handlers[handlers.length - 1]();
};

// Calls `onClose` when Escape is pressed while `active`, but only for the topmost active handler.
// The universal-cancel for dialogs/popups/modes.
export const useCloseOnEscape = (active: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!active) return;

    if (!listening) {
      window.addEventListener("keydown", onKeyDown, true);
      listening = true;
    }

    const handler = () => onClose();
    handlers.push(handler);

    return () => {
      const index = handlers.lastIndexOf(handler);
      if (index !== -1) handlers.splice(index, 1);
    };
  }, [active, onClose]);
};
