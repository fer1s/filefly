import { homeDir } from "@tauri-apps/api/path";

import { getVolumes, readDirectory } from "@/shared/services/api";

import {
  FAVORITE_ORDER,
  FAVORITE_RESOLVER,
  HIDDEN_MOUNT_PREFIX,
} from "./constants";
import type { Favorite, Location, PickerEntry } from "./types";

// Split an absolute path into cumulative breadcrumb crumbs (label + the path to jump to).
export const crumbsFor = (path: string): PickerEntry[] => {
  const segments = path.split("/").filter(Boolean);
  let acc = "";
  return segments.map((name) => {
    acc += "/" + name;
    return { name, path: acc };
  });
};

// Resolve the standard user directories for the "Favorites" source list, in display order. Any that
// the OS can't resolve are dropped rather than shown as broken shortcuts.
export const loadFavorites = async (): Promise<Favorite[]> => {
  const entries = await Promise.all(
    FAVORITE_ORDER.map(async (key) => {
      try {
        return { key, path: stripTrailingSlash(await FAVORITE_RESOLVER[key]()) };
      } catch {
        return null;
      }
    }),
  );
  return entries.filter((entry): entry is Favorite => entry !== null);
};

// The mounted volumes for the "Locations" source list, minus macOS internal firmlink volumes (the
// APFS data volume et al.) which duplicate the boot volume's name and aren't browsable.
export const loadLocations = async (): Promise<Location[]> => {
  const volumes = await getVolumes();
  return volumes
    .filter((volume) => !volume.mountPoint.startsWith(HIDDEN_MOUNT_PREFIX))
    .map((volume) => ({
      name: volume.name || volume.mountPoint,
      path: volume.mountPoint,
    }));
};

// The user's home folder, or "" if it can't be resolved (used as the default open location).
export const resolveHome = async (): Promise<string> => {
  try {
    return stripTrailingSlash(await homeDir());
  } catch {
    return "";
  }
};

// Sub-folders of `path` as list rows: directories only, hidden entries skipped, name-sorted.
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

const stripTrailingSlash = (path: string) => path.replace(/\/+$/, "") || path;
