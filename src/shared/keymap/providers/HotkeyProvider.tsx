import { useCallback, useEffect, useMemo, useRef } from "react";

import { resolve } from "../dispatch";
import type { HotkeyScope } from "../scopes";
import type { HotkeyEntry, KeymapProviderProps } from "../types";
import { HotkeyContext } from "./HotkeyContext";
import { useKeymap } from "./KeymapContext";

// Owns the hotkey registry, the active-scope stack, and the single window-capture keydown listener
// that resolves and dispatches. Capture phase + window means it runs before any (not-yet-migrated)
// document listeners, so migrated handlers reliably win. Lives inside KeymapProvider because
// keymap-action hotkeys resolve against the live keymap.
export const HotkeyProvider = ({ children }: KeymapProviderProps) => {
  const { keymap } = useKeymap();
  // Refs so the long-lived listener always reads the latest values without re-subscribing.
  const keymapRef = useRef(keymap);
  useEffect(() => {
    keymapRef.current = keymap;
  }, [keymap]);

  const registryRef = useRef<HotkeyEntry[]>([]);
  const scopeStackRef = useRef<Array<{ scope: HotkeyScope; token: number }>>(
    [],
  );
  const nextId = useRef(0);
  const nextToken = useRef(0);

  const register = useCallback((entry: Omit<HotkeyEntry, "id">) => {
    const id = nextId.current++;
    registryRef.current.push({ ...entry, id });
    return () => {
      const i = registryRef.current.findIndex((e) => e.id === id);
      if (i !== -1) registryRef.current.splice(i, 1);
    };
  }, []);

  const pushScope = useCallback((scope: HotkeyScope) => {
    const token = nextToken.current++;
    scopeStackRef.current.push({ scope, token });
    return () => {
      const i = scopeStackRef.current.findIndex((s) => s.token === token);
      if (i !== -1) scopeStackRef.current.splice(i, 1);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeScopes = new Set(scopeStackRef.current.map((s) => s.scope));
      const ordered = resolve(
        event,
        registryRef.current,
        activeScopes,
        keymapRef.current,
      );
      for (const entry of ordered) {
        // `false` = "not handled, fall through"; anything else consumes the event.
        if (entry.handler(event) === false) continue;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const value = useMemo(() => ({ register, pushScope }), [register, pushScope]);

  return (
    <HotkeyContext.Provider value={value}>{children}</HotkeyContext.Provider>
  );
};
