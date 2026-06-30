import { useCallback, useMemo, useState, type ReactNode } from "react";

import { KEY } from "@/shared/constants";

import { KEYMAP_ACTION } from "../constants";
import { HOTKEY_SCOPE } from "../scopes";
import { useHotkey } from "../hooks/useHotkey";
import { useHotkeyScope } from "../hooks/useHotkeyScope";
import { ShortcutHelpContext } from "./ShortcutHelpContext";

// Drives the shortcuts cheat-sheet dialog: `active` is whether it's open. Toggled with the
// help_shortcuts binding (Cmd/Ctrl+/), dismissed with the same binding or Escape.
export const ShortcutHelpProvider = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState(false);

  const toggle = useCallback(() => setActive((prev) => !prev), []);
  const exit = useCallback(() => setActive(false), []);

  // Toggle from anywhere — including while typing, matching the previous behaviour.
  useHotkey(KEYMAP_ACTION.HELP_SHORTCUTS, toggle, { allowInInput: true });
  // While open it behaves like a modal: Escape dismisses it (and wins over lower scopes).
  useHotkeyScope(HOTKEY_SCOPE.MODAL, active);
  useHotkey({ keys: [KEY.ESCAPE] }, exit, {
    scope: HOTKEY_SCOPE.MODAL,
    when: active,
  });

  const value = useMemo(
    () => ({ active, toggle, exit }),
    [active, toggle, exit],
  );

  return (
    <ShortcutHelpContext.Provider value={value}>
      {children}
    </ShortcutHelpContext.Provider>
  );
};
