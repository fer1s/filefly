import { useCallback, useEffect, useMemo, useState } from "react";

import { KeymapManager } from "../managers/KeymapManager";
import { KeymapContext } from "./KeymapContext";
import type { KeymapAction } from "../constants";
import type { Keymap, KeyBinding, KeymapProviderProps } from "../types";

// Loads the keymap from the backend on mount and exposes it (plus setBinding) via context.
export const KeymapProvider = ({ children }: KeymapProviderProps) => {
  const manager = useMemo(() => new KeymapManager(), []);
  const [keymap, setKeymap] = useState<Keymap>({});

  useEffect(() => {
    let cancelled = false;
    manager.getKeymap().then((loaded) => {
      if (!cancelled) setKeymap(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [manager]);

  const setBinding = useCallback(
    (action: KeymapAction, binding: KeyBinding) => {
      // Reflect the change immediately so consumers update live.
      setKeymap((prev) => ({ ...prev, [action]: binding }));
      // TODO: persist to keymap.toml (see KeymapManager).
    },
    [],
  );

  const value = useMemo(() => ({ keymap, setBinding }), [keymap, setBinding]);

  return (
    <KeymapContext.Provider value={value}>{children}</KeymapContext.Provider>
  );
};
