import { HotkeyProvider as CommandsHotkeyProvider } from "@sito/commands/react";

import { HOTKEY_CONFIG } from "../scopes";
import type { KeymapProviderProps } from "../types";
import { useKeymap } from "./KeymapContext";

// Owns the hotkey registry, the active-scope stack, and the single window-capture keydown listener
// that resolves and dispatches. Capture phase + window means it runs before any (not-yet-migrated)
// document listeners, so migrated handlers reliably win. Lives inside KeymapProvider because
// keymap-action hotkeys resolve against the live keymap.
export const HotkeyProvider = ({ children }: KeymapProviderProps) => {
  const { keymap } = useKeymap();

  return (
    <CommandsHotkeyProvider keymap={keymap} config={HOTKEY_CONFIG}>
      {children}
    </CommandsHotkeyProvider>
  );
};
