import { getVolumes, readDirectory } from "@/shared/services/api";

import type { PickerEntry } from "./types";

// Split an absolute path into cumulative breadcrumb crumbs (label + the path to jump to).
export const crumbsFor = (path: string): PickerEntry[] => {
  const segments = path.split("/").filter(Boolean);
  let acc = "";
  return segments.map((name) => {
    acc += "/" + name;
    return { name, path: acc };
  });
};

// Volumes as picker rows (the Locations root), addressed by mount point.
export const loadVolumes = async (): Promise<PickerEntry[]> => {
  const volumes = await getVolumes();
  return volumes.map((volume) => ({
    name: volume.name || volume.mountPoint,
    path: volume.mountPoint,
  }));
};

// Sub-folders of `path` as picker rows: directories only, hidden entries skipped, name-sorted.
export const loadFolders = async (path: string): Promise<PickerEntry[]> => {
  try {
    const dir = await readDirectory(path);
    return dir
      .filter((entry) => entry.metadata.isDir && !entry.name.startsWith("."))
      .map((entry) => ({ name: entry.name, path: entry.path }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // ACCESS_DENIED or an unreadable folder: show it as empty rather than breaking the picker.
    return [];
  }
};
