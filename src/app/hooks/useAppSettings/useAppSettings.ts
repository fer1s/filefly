import { useCallback, useEffect, useRef, useState } from "react";

import { getSettings, setSettings, type AppSettings } from "@/shared/services/api";

import { DEFAULT_SETTINGS, SETTINGS_PERSIST_DEBOUNCE_MS } from "./constants";

// Owns the app-wide settings: hydrates them from settings.toml on launch and persists every
// change back (debounced, so dragging a slider doesn't hammer the disk). settings.toml is the
// source of truth — this hook is just its in-memory mirror plus the write-back.
export const useAppSettings = () => {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  // Latest settings, kept in a ref so the debounced writer always flushes the newest value.
  const latest = useRef<AppSettings>(settings);
  const timer = useRef<number | null>(null);

  // Hydrate from disk once on mount. Until this resolves, the defaults above are shown.
  useEffect(() => {
    getSettings()
      .then((loaded) => {
        latest.current = loaded;
        setSettingsState(loaded);
      })
      .catch((error) => console.error("Failed to load settings:\n" + error));
  }, []);

  // Flush the latest settings to disk after the debounce window.
  const schedulePersist = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setSettings(latest.current).catch((error) =>
        console.error("Failed to persist settings:\n" + error),
      );
    }, SETTINGS_PERSIST_DEBOUNCE_MS);
  }, []);

  // Apply a partial update: reflect it immediately in state and schedule the write-back.
  const update = useCallback(
    (patch: Partial<AppSettings>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setSettingsState(next);
      schedulePersist();
    },
    [schedulePersist],
  );

  return { settings, update };
};
