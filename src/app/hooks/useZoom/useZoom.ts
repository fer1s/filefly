import { useCallback, useEffect, useState } from "react";

import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { ZOOM_DEFAULT, ZOOM_STEP, type ViewMode } from "@/shared/constants";

import { clampZoom } from "./utils";

// Per-folder, per-view zoom: loads the saved zoom for the active folder in the current view (or
// the configurable default) on navigation or view toggle, and persists on every explicit zoom.
// Grid and list keep separate values: a tile size that suits the grid is oversized for rows.
// `path` is the active folder ("" = Volumes). `defaultZoom` is the app-wide fallback (owned by
// app settings, not this hook).
export const useZoom = (
  fs: FileSystemManager,
  path: string,
  view: ViewMode,
  defaultZoom: number,
) => {
  const [zoom, setZoom] = useState<number>(ZOOM_DEFAULT);

  // Load the saved zoom on navigation or view change, falling back to the configurable default.
  useEffect(() => {
    if (path === "") return;
    let cancelled = false;
    fs.getFolderZoom(path, view).then((saved) => {
      if (!cancelled) setZoom(saved ?? defaultZoom);
    });
    return () => {
      cancelled = true;
    };
  }, [fs, path, view, defaultZoom]);

  // Persist the folder's zoom when it actually changed. Persisting only on explicit zoom
  // (not in an effect watching `zoom`) avoids a load -> save loop.
  const persistZoom = useCallback(
    (next: number, current: number) => {
      if (next !== current)
        fs.setFolderZoom(path, view, next).catch((err) =>
          console.error("Failed to persist zoom preference:\n" + err),
        );
    },
    [fs, path, view],
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

  return { zoom, zoomIn, zoomOut, setZoomTo };
};
