import { useEffect, useRef } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { VIEW_MODE, type ViewMode } from "@/shared/constants";
import * as api from "@/shared/services/api";

const isViewMode = (value: string | null): value is ViewMode =>
  value === VIEW_MODE.GRID || value === VIEW_MODE.LIST;

// Per-folder grid/list view, persisted in the central config. On navigation the folder's saved
// view is applied (the current view is kept if none is saved); when the user toggles the view
// while in a folder it's saved for that folder. The load itself never triggers a save.
export const useFolderView = (path: string) => {
  const { view, setView } = useStateContext();
  const loadingRef = useRef(false);
  const lastSavedRef = useRef<ViewMode | null>(null);
  const viewRef = useRef(view);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Apply the folder's saved view on entry.
  useEffect(() => {
    let cancelled = false;
    loadingRef.current = true;
    api
      .getFolderView(path)
      .then((saved) => {
        if (cancelled) return;
        if (isViewMode(saved)) {
          lastSavedRef.current = saved;
          setView(saved);
        } else {
          // No preference: treat the current view as already-saved so merely visiting the
          // folder doesn't persist anything.
          lastSavedRef.current = viewRef.current;
        }
      })
      .finally(() => {
        if (!cancelled) loadingRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [path, setView]);

  // Persist when the user changes the view while in this folder (not the load above).
  useEffect(() => {
    if (loadingRef.current) return;
    if (lastSavedRef.current === view) return;
    lastSavedRef.current = view;
    api.setFolderView(path, view).catch((err) => {
      console.error("Failed to persist view preference:\n" + err);
    });
  }, [view, path]);
};
