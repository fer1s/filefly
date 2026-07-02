import { useCallback, useEffect, useRef, useState } from "react";

import { Volume, DirEntry } from "@/shared/models";
import { ACCESS_DENIED_ERROR, RECENTS } from "@/shared/constants";
import { isTagsPath, tagFromPath } from "@/shared/utils";

import { ROUTES } from "../../routes";
import { DIRECTORY_WATCH_DEBOUNCE_MS, VOLUMES_MOUNT_DIR } from "./constants";
import type { UseDirectoryContentsArgs } from "./types";

// Owns the listing for the active folder: volumes, entries and the access-denied flag. Loads on
// navigation, syncs the route (Volumes vs Directory), and watches the folder for external
// changes so the list auto-refreshes.
export const useDirectoryContents = ({
  fs,
  path,
  navigate,
  locationPathname,
  hideSystemRecents,
}: UseDirectoryContentsArgs) => {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [dirContent, setDirContent] = useState<DirEntry[]>([]);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  // Flips true once the first listing (a folder, or the Volumes view at the root) has loaded, so
  // the app can reveal the window with real content instead of an empty shell. Latched once.
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    setReady(true);
  }, []);
  // Which view the app launched on: at the root the Volumes list *is* the content, so readiness
  // waits on the volume load; on a folder it waits on that folder's listing. Captured once.
  const startedOnVolumes = useRef(path === "");

  const fetchVolumes = useCallback(
    async () => setVolumes(await fs.listVolumes()),
    [fs],
  );

  // Read a directory, reporting whether the OS blocked it (Full Disk Access required, e.g. the
  // Trash). Kept free of setState so callers own state updates in their async callbacks.
  const loadDirectory = useCallback(
    async (target: string): Promise<{ files: DirEntry[]; denied: boolean }> => {
      try {
        // Recents and tag views are virtual listings (Finder-style), not real folders to read.
        const files =
          target === RECENTS
            ? await fs.getRecentFiles(hideSystemRecents)
            : isTagsPath(target)
              ? await fs.findTagged(tagFromPath(target))
              : await fs.readDirectory(target);
        return { files, denied: false };
      } catch (err) {
        return { files: [], denied: String(err).includes(ACCESS_DENIED_ERROR) };
      }
    },
    [fs, hideSystemRecents],
  );

  // Reload the current view (used after filesystem operations like copy/move/rename/delete).
  const refreshDir = useCallback(() => {
    if (path === "") return fetchVolumes();
    loadDirectory(path).then(({ files, denied }) => {
      setDirContent(files);
      setAccessDenied(denied);
    });
  }, [loadDirectory, fetchVolumes, path]);

  // Keep a ref to the latest refreshDir so the watcher below doesn't re-subscribe on every
  // change to it (it changes with `path`, which already re-runs the watch effect).
  const refreshDirRef = useRef(refreshDir);
  useEffect(() => {
    refreshDirRef.current = refreshDir;
  }, [refreshDir]);

  // Watch the current directory so external changes (e.g. `mv`/`rm` from a terminal, or another
  // app) refresh the listing automatically. Debounced, and torn down when the path changes.
  useEffect(() => {
    if (path === "" || path === RECENTS || isTagsPath(path)) return; // Nothing real to watch.

    let cancelled = false;
    let stopWatching: (() => void) | undefined;
    let timer: number | undefined;

    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => refreshDirRef.current(),
        DIRECTORY_WATCH_DEBOUNCE_MS,
      );
    };

    fs.watchDirectory(path, onChange)
      .then((unwatch) => {
        if (cancelled) unwatch();
        else stopWatching = unwatch;
      })
      .catch((err) => {
        // Unwatchable paths (e.g. permission denied) simply won't auto-refresh.
        console.error("Failed to watch directory:\n" + err);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopWatching?.();
    };
  }, [fs, path]);

  // Initial volumes load.
  useEffect(() => {
    let cancelled = false;
    fs.listVolumes().then((nextVolumes) => {
      if (!cancelled) setVolumes(nextVolumes);
      // Launched at the root → volumes are the first painted content.
      if (startedOnVolumes.current) markReady();
    });
    return () => {
      cancelled = true;
    };
  }, [fs, markReady]);

  // Keep the volume list in sync as external disks are attached/removed — they mount under
  // /Volumes, so a change there means re-list. Debounced; harmless no-op where /Volumes is
  // unwatchable (non-macOS).
  useEffect(() => {
    let cancelled = false;
    let stopWatching: (() => void) | undefined;
    let timer: number | undefined;

    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fetchVolumes, DIRECTORY_WATCH_DEBOUNCE_MS);
    };

    fs.watchDirectory(VOLUMES_MOUNT_DIR, onChange)
      .then((unwatch) => {
        if (cancelled) unwatch();
        else stopWatching = unwatch;
      })
      .catch((err) => console.error("Failed to watch volumes:\n" + err));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopWatching?.();
    };
  }, [fs, fetchVolumes]);

  // Load the folder (or route to Volumes when at the root) whenever the path changes.
  useEffect(() => {
    if (path === "") {
      navigate(ROUTES.volumes);
      return;
    }

    // Guard against a stale load resolving after we've already navigated away: e.g. leaving the
    // Trash (slow, ends denied) for Recents would otherwise leave the access-denied notice up.
    let cancelled = false;
    loadDirectory(path).then(({ files, denied }) => {
      if (cancelled) return;
      setDirContent(files);
      setAccessDenied(denied);
      markReady();
      if (locationPathname !== ROUTES.directory && path !== "")
        navigate(ROUTES.directory);
    });
    return () => {
      cancelled = true;
    };
  }, [loadDirectory, locationPathname, navigate, path, markReady]);

  return {
    volumes,
    setVolumes,
    dirContent,
    setDirContent,
    accessDenied,
    refreshDir,
    ready,
  };
};
