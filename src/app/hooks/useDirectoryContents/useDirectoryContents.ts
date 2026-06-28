import { useCallback, useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { Volume, DirEntry } from "@/shared/models";
import { ACCESS_DENIED_ERROR } from "@/shared/constants";

import { ROUTES } from "../../routes";
import { DIRECTORY_WATCH_DEBOUNCE_MS } from "./constants";

type Args = {
  fs: FileSystemManager;
  // Active folder ("" = the Volumes view).
  path: string;
  navigate: NavigateFunction;
  locationPathname: string;
};

// Owns the listing for the active folder: volumes, entries and the access-denied flag. Loads on
// navigation, syncs the route (Volumes vs Directory), and watches the folder for external
// changes so the list auto-refreshes.
export const useDirectoryContents = ({
  fs,
  path,
  navigate,
  locationPathname,
}: Args) => {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [dirContent, setDirContent] = useState<DirEntry[]>([]);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  const fetchVolumes = useCallback(
    async () => setVolumes(await fs.listVolumes()),
    [fs],
  );

  // Read a directory, reporting whether the OS blocked it (Full Disk Access required, e.g. the
  // Trash). Kept free of setState so callers own state updates in their async callbacks.
  const loadDirectory = useCallback(
    async (target: string): Promise<{ files: DirEntry[]; denied: boolean }> => {
      try {
        return { files: await fs.readDirectory(target), denied: false };
      } catch (err) {
        return { files: [], denied: String(err).includes(ACCESS_DENIED_ERROR) };
      }
    },
    [fs],
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
    if (path === "") return; // Volumes view — nothing to watch.

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
    });
    return () => {
      cancelled = true;
    };
  }, [fs]);

  // Load the folder (or route to Volumes when at the root) whenever the path changes.
  useEffect(() => {
    if (path === "") {
      navigate(ROUTES.volumes);
      return;
    }

    loadDirectory(path).then(({ files, denied }) => {
      setDirContent(files);
      setAccessDenied(denied);
      if (locationPathname !== ROUTES.directory && path !== "")
        navigate(ROUTES.directory);
    });
  }, [loadDirectory, locationPathname, navigate, path]);

  return {
    volumes,
    setVolumes,
    dirContent,
    setDirContent,
    accessDenied,
    refreshDir,
  };
};
