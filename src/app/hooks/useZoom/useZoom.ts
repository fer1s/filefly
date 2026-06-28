import { useCallback, useEffect, useState } from "react";

import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { ZOOM_DEFAULT, ZOOM_STEP } from "@/shared/constants";

import { DEFAULT_ZOOM_STORAGE_KEY } from "./constants";
import { clampZoom, loadDefaultZoom } from "./utils";

// Per-folder zoom: loads the active folder's saved zoom (or the configurable default) on
// navigation, and persists on every explicit zoom. `path` is the active folder ("" = Volumes).
export const useZoom = (fs: FileSystemManager, path: string) => {
  const [zoom, setZoom] = useState<number>(ZOOM_DEFAULT);
  const [defaultZoom, setDefaultZoomState] = useState<number>(loadDefaultZoom);

  // Load the folder's saved zoom on navigation, falling back to the configurable default.
  useEffect(() => {
    if (path === "") return;
    let cancelled = false;
    fs.getFolderZoom(path).then((saved) => {
      if (!cancelled) setZoom(saved ?? defaultZoom);
    });
    return () => {
      cancelled = true;
    };
  }, [fs, path, defaultZoom]);

  // Set and persist the default zoom for folders without their own saved value.
  const setDefaultZoom = useCallback((value: number) => {
    const next = clampZoom(value);
    setDefaultZoomState(next);
    localStorage.setItem(DEFAULT_ZOOM_STORAGE_KEY, String(next));
  }, []);

  // Persist the folder's zoom when it actually changed. Persisting only on explicit zoom
  // (not in an effect watching `zoom`) avoids a load -> save loop.
  const persistZoom = useCallback(
    (next: number, current: number) => {
      if (next !== current)
        fs.setFolderZoom(path, next).catch((err) =>
          console.error("Failed to persist zoom preference:\n" + err),
        );
    },
    [fs, path],
  );

  // Set the zoom to an absolute multiplier (used by the slider).
  const setZoomTo = useCallback(
    (value: number) => {
      if (path === "") return;
      setZoom((current) => {
        const next = clampZoom(value);
        persistZoom(next, current);
        return next;
      });
    },
    [path, persistZoom],
  );

  const stepZoom = useCallback(
    (delta: number) => {
      if (path === "") return;
      setZoom((current) => {
        const next = clampZoom(current + delta);
        persistZoom(next, current);
        return next;
      });
    },
    [path, persistZoom],
  );

  const zoomIn = useCallback(() => stepZoom(ZOOM_STEP), [stepZoom]);
  const zoomOut = useCallback(() => stepZoom(-ZOOM_STEP), [stepZoom]);

  return { zoom, zoomIn, zoomOut, setZoomTo, defaultZoom, setDefaultZoom };
};
