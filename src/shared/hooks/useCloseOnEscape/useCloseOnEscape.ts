import { useEffect } from "react";

import { KEY } from "@/shared/constants";

// Calls `onClose` when Escape is pressed while `active`. The universal-cancel for dialogs/popups.
export const useCloseOnEscape = (active: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === KEY.ESCAPE) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onClose]);
};
