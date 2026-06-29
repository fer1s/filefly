import { useEffect } from "react";

import { useKeymap, matchesBinding, KEYMAP_ACTION } from "@/shared/keymap";

// Opens settings on the VS Code-style shortcut (Cmd/Ctrl + ,), app-wide.
export const useSettingsShortcut = (onOpen: () => void) => {
  const { keymap } = useKeymap();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (matchesBinding(event, keymap[KEYMAP_ACTION.OPEN_SETTINGS])) {
        event.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [keymap, onOpen]);
};
