import { useEffect } from "react";

import type { Volume } from "@/shared/models";
import { useConnections } from "@/features/connections";

import { VOLUMES_PREFIX } from "./constants";
import { isUnderMount } from "./utils";

// When the folder in view sits on a mount that has gone away — an SMB share whose server shut down,
// or an ejected disk — macOS unmounts it and leaves the app stranded in a stale, empty directory
// (the exact symptom: the share dies, Finder-style views hang until macOS drops the mount, then
// keep showing the now-empty folder). This bounces the active tab to the Volumes view once the
// mount is actually gone.
//
// Detection reads the OS mount table (`smb_mounts` → /sbin/mount) and the volume list, never the
// dead path itself — touching a hung mount would block — so it's safe to run while the share is
// still timing out. It fires when `volumes` changes (the /Volumes watcher re-lists on unmount) or
// on navigation. Runs only for /Volumes paths, and bounces solely when neither a live local volume
// nor a live SMB mount covers the path, so an alive share is never disturbed (sysinfo may omit SMB
// mounts, hence the extra mount-table check).
export const useStaleMountRedirect = (
  path: string,
  volumes: Volume[],
  setPath: (path: string) => void,
) => {
  const { smbManager } = useConnections();

  useEffect(() => {
    if (!path.startsWith(VOLUMES_PREFIX)) return;
    // A currently-listed local/removable volume backs it → alive, nothing to do.
    if (volumes.some((volume) => isUnderMount(path, volume.mountPoint))) return;

    let cancelled = false;
    smbManager
      .mounts()
      .then((mounts) => {
        if (cancelled) return;
        // Still an SMB mount in the OS table → alive (e.g. a share sysinfo didn't report).
        if (mounts.some((mount) => isUnderMount(path, mount.mountPoint)))
          return;
        setPath("");
      })
      // Can't read the mount table → don't bounce on uncertainty.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [path, volumes, setPath, smbManager]);
};
