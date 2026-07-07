import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { Volume, DirEntry } from "@/shared/models";
import {
  ACCESS_DENIED_ERROR,
  RECENTS,
  SFTP_SCHEME,
  SSH_HOST_KEY_CHANGED,
} from "@/shared/constants";
import { isTagsPath, tagFromPath } from "@/shared/utils";
import { t } from "@/lang";

import { ROUTES } from "../../routes";
import {
  DIRECTORY_LOADING_SPINNER_DELAY_MS,
  DIRECTORY_WATCH_DEBOUNCE_MS,
  VOLUMES_MOUNT_DIR,
} from "./constants";
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
  // Human-readable reason the current listing failed (remote connect/auth errors), or null. Shown
  // as a persistent notice in the directory view — a toast would vanish while the folder stays
  // deceptively empty. Cleared by the next successful load.
  const [loadError, setLoadError] = useState<string | null>(null);
  // True while a *navigation* is fetching the new folder and the old entries are still in state.
  // The directory view shows a spinner instead of the stale listing (matters for slow SFTP loads).
  // Set only by the path-change effect, never by refreshDir, so background refreshes don't flash it.
  const [loadingDir, setLoadingDir] = useState<boolean>(false);
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
    async (
      target: string,
    ): Promise<{
      files: DirEntry[];
      denied: boolean;
      error: string | null;
    }> => {
      try {
        // Recents and tag views are virtual listings (Finder-style), not real folders to read.
        const files =
          target === RECENTS
            ? await fs.getRecentFiles(hideSystemRecents)
            : isTagsPath(target)
              ? await fs.findTagged(tagFromPath(target))
              : await fs.readDirectory(target);
        return { files, denied: false, error: null };
      } catch (err) {
        const denied = String(err).includes(ACCESS_DENIED_ERROR);
        // Remote (SFTP) failures are opaque — connect/auth errors would otherwise show as a blank
        // folder with no clue why. Surface them as a persistent notice in the directory view; a
        // changed host key gets its own clear warning.
        const error =
          !denied && target.startsWith(SFTP_SCHEME)
            ? String(err).includes(SSH_HOST_KEY_CHANGED)
              ? t.connections.hostKeyChanged
              : t.connections.listError(String(err))
            : null;
        return { files: [], denied, error };
      }
    },
    [fs, hideSystemRecents],
  );

  // Reload the current view (used after filesystem operations like copy/move/rename/delete).
  const refreshDir = useCallback(() => {
    if (path === "") return fetchVolumes();
    loadDirectory(path).then(({ files, denied, error }) => {
      setDirContent(files);
      setAccessDenied(denied);
      setLoadError(error);
    });
  }, [loadDirectory, fetchVolumes, path]);

  // Keep a ref to the latest refreshDir so the watcher below doesn't re-subscribe on every
  // change to it (it changes with `path`, which already re-runs the watch effect).
  const refreshDirRef = useRef(refreshDir);
  useEffect(() => {
    refreshDirRef.current = refreshDir;
  }, [refreshDir]);

  // Refs so the navigation-load effect can depend on `path` alone. Otherwise it also re-runs when
  // the route transition it triggers changes `locationPathname`/`navigate`, firing a second load
  // for the same path — cheap for local reads, but a wasted second SSH connection for slow SFTP.
  // Updated in an effect (not during render, which the react-hooks lint forbids); effects run in
  // declaration order, so this one refreshes the refs before the navigation-load effect below
  // reads them on the same commit.
  const loadDirectoryRef = useRef(loadDirectory);
  const navigateRef = useRef(navigate);
  const locationRef = useRef(locationPathname);
  useEffect(() => {
    loadDirectoryRef.current = loadDirectory;
    navigateRef.current = navigate;
    locationRef.current = locationPathname;
  }, [loadDirectory, navigate, locationPathname]);

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

  // Refresh when the window regains focus: after files were changed by another app or the terminal
  // while this app was in the background, re-read the open folder and re-fetch the volumes so the
  // listing and the sidebar / volumes-view disk usage reflect reality. Covers external changes the
  // directory watcher can miss (it only watches the open folder, non-recursively) and keeps the
  // volume free/used bars fresh (get_volumes is otherwise only re-read on launch or /Volumes mount
  // changes, so freeing space on the boot volume never updated them).
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (!focused) return;
        refreshDirRef.current();
        fetchVolumes();
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch((err) => console.error("Failed to watch window focus:\n" + err));
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [fetchVolumes]);

  // Keep the recursive size-index watcher (Phase B) pointed at the viewed folder so live
  // filesystem changes bubble into the cached ancestor sizes in real time — this is what keeps
  // folder sizes (Properties, the Size column) from going stale after deep changes. Local folders
  // only; remote/virtual listings aren't size-indexed. Stops when leaving the folder.
  useEffect(() => {
    if (
      path === "" ||
      path === RECENTS ||
      isTagsPath(path) ||
      path.startsWith(SFTP_SCHEME)
    )
      return;
    void fs.watchDirSizes(path);
    return () => {
      void fs.watchDirSizes("");
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

  // Load the folder (or route to Volumes when at the root) whenever the path changes. Depends on
  // `path` alone (everything else via refs) so it fires exactly once per navigation.
  useEffect(() => {
    if (path === "") {
      navigateRef.current(ROUTES.volumes);
      return;
    }

    // Show the spinner only if the listing hasn't arrived within the delay: fast local reads
    // never flash it, slow remotes (SFTP) cross the threshold and get it.
    let cancelled = false;
    const spinnerTimer = window.setTimeout(
      () => setLoadingDir(true),
      DIRECTORY_LOADING_SPINNER_DELAY_MS,
    );

    // Guard against a stale load resolving after we've already navigated away: e.g. leaving the
    // Trash (slow, ends denied) for Recents would otherwise leave the access-denied notice up.
    loadDirectoryRef.current(path).then(({ files, denied, error }) => {
      if (cancelled) return;
      window.clearTimeout(spinnerTimer);
      setLoadingDir(false);
      setDirContent(files);
      setAccessDenied(denied);
      setLoadError(error);
      markReady();
      if (locationRef.current !== ROUTES.directory && path !== "")
        navigateRef.current(ROUTES.directory);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(spinnerTimer);
      setLoadingDir(false);
    };
  }, [path, markReady]);

  return {
    volumes,
    setVolumes,
    dirContent,
    setDirContent,
    accessDenied,
    loadError,
    loadingDir,
    refreshDir,
    ready,
  };
};
