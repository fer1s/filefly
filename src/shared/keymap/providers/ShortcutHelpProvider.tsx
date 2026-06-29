import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { KEY } from "@/shared/constants";

import { matchesBinding } from "../utils";
import { KEYMAP_ACTION } from "../constants";
import { useKeymap } from "./KeymapContext";
import { ShortcutHelpContext } from "./ShortcutHelpContext";

// Drives the shortcuts cheat-sheet dialog: `active` is whether it's open. Toggled with the
// help_shortcuts binding (Cmd/Ctrl+/), dismissed with the same binding or Escape.
export const ShortcutHelpProvider = ({ children }: { children: ReactNode }) => {
  const { keymap } = useKeymap();
  const [active, setActive] = useState(false);

  const toggle = useCallback(() => setActive((prev) => !prev), []);
  const exit = useCallback(() => setActive(false), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (matchesBinding(e, keymap[KEYMAP_ACTION.HELP_SHORTCUTS])) {
        e.preventDefault();
        toggle();
      } else if (active && e.key === KEY.ESCAPE) {
        exit();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [keymap, active, toggle, exit]);

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
