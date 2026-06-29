import type { Volume } from "@/shared/models";

// The volume a path lives on: the one whose mount point is the longest matching prefix of the
// path (so "/Volumes/USB" wins over "/" for a path inside it). Null for virtual paths (Recents).
export const volumeForPath = (
  path: string,
  volumes: Volume[],
): Volume | null => {
  let best: Volume | null = null;
  for (const volume of volumes) {
    const prefix = volume.mountPoint === "/" ? "/" : `${volume.mountPoint}/`;
    if (path === volume.mountPoint || path.startsWith(prefix)) {
      if (!best || volume.mountPoint.length > best.mountPoint.length)
        best = volume;
    }
  }
  return best;
};
