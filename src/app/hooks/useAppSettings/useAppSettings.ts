import { useCallback, useEffect, useRef, useState } from "react";

import {
  getSettings,
  setSettings,
  type AppSettings,
} from "@/shared/services/api";

import { DEFAULT_SETTINGS, SETTINGS_PERSIST_DEBOUNCE_MS } from "./constants";

// Owns the app-wide settings: hydrates them from settings.toml on launch and persists every
// change back (debounced, so dragging a slider doesn't hammer the disk). settings.toml is the
// source of truth — this hook is just its in-memory mirror plus the write-back. `saving` is true
// from the moment a change is made until its write to disk resolves (drives the StatusBar spinner).
export const useAppSettings = () => {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  // Latest settings, kept in a ref so the debounced/flushed writer always uses the newest value.
  const latest = useRef<AppSettings>(settings);
  const timer = useRef<number | null>(null);
  // True once the disk load has resolved, so a pending write never clobbers settings.toml with
  // the defaults before hydration has happened.
  const hydrated = useRef(false);
  // Same signal as a render value, so the app can wait for real settings (sidebar width, opacity…)
  // before revealing the window and avoid a defaults→loaded flash on launch.
  const [ready, setReady] = useState(false);

  // Write the latest settings to disk, clearing the spinner when it resolves.
  const write = useCallback(() => {
    if (!hydrated.current) return;
    setSettings(latest.current)
      .catch((error) => console.error("Failed to persist settings:\n" + error))
      .finally(() => setSaving(false));
  }, []);

  // Write immediately, cancelling any pending debounced write.
  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    write();
  }, [write]);

  // Hydrate from disk once on mount. Until this resolves, the defaults above are shown.
  useEffect(() => {
    getSettings()
      .then((loaded) => {
        latest.current = loaded;
        hydrated.current = true;
        setSettingsState(loaded);
      })
      .catch((error) => {
        hydrated.current = true;
        console.error("Failed to load settings:\n" + error);
      })
      .finally(() => setReady(true));
  }, []);

  // Flush any pending write when the window is hidden/closed (it hides to the tray, so a quit
  // right after a change would otherwise drop the debounced write).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [flush]);

  // Apply a partial update: reflect it immediately in state and schedule the debounced write-back.
  const update = useCallback(
    (patch: Partial<AppSettings>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setSettingsState(next);
      setSaving(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(write, SETTINGS_PERSIST_DEBOUNCE_MS);
    },
    [write],
  );

  return { settings, update, saving, ready };
};
