import { homeDir } from "@tauri-apps/api/path";

import { getVolumes, readDirectory } from "@/shared/services/api";
import { extension } from "@/shared/utils";

import {
  FAVORITE_ORDER,
  FAVORITE_RESOLVER,
  HIDDEN_MOUNT_PREFIX,
} from "./constants";
import { PICK_KIND, type PickKind } from "./types";
import type { Favorite, Location, PickerEntry } from "./types";

// Split an absolute path into cumulative breadcrumb crumbs (label + the path to jump to).
export const crumbsFor = (path: string): { name: string; path: string }[] => {
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
        return {
          key,
          path: stripTrailingSlash(await FAVORITE_RESOLVER[key]()),
        };
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

// Whether a file matches the picker's extension filter (case-insensitive). No filter → everything
// matches. Folders are never filtered — they're always navigable.
const matchesExtensions = (
  name: string,
  extensions?: readonly string[],
): boolean => {
  if (!extensions || extensions.length === 0) return true;
  const ext = extension(name).toLowerCase();
  return extensions.some((e) => e.toLowerCase() === ext);
};

// The rows for `path`, as list entries. At the virtual root (empty path) these are the mounted
// volumes. Otherwise: folders are always included (navigable); files are included only in file
// mode and only when they pass the extension filter. Hidden dotfiles are skipped; directories are
// listed before files, then alphabetically.
export const loadEntries = async (
  path: string,
  kind: PickKind,
  extensions?: readonly string[],
): Promise<PickerEntry[]> => {
  if (path === "") {
    const locations = await loadLocations();
    return locations.map((loc) => ({ ...loc, isDir: true }));
  }
  try {
    const dir = await readDirectory(path);
    return dir
      .filter((entry) => {
        if (entry.name.startsWith(".")) return false;
        if (entry.metadata.isDir) return true;
        return (
          kind === PICK_KIND.FILE && matchesExtensions(entry.name, extensions)
        );
      })
      .map((entry) => ({
        name: entry.name,
        path: entry.path,
        isDir: entry.metadata.isDir,
      }))
      .sort((a, b) =>
        a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
      );
  } catch {
    // ACCESS_DENIED or an unreadable folder: show it as empty rather than breaking the picker.
    return [];
  }
};

const stripTrailingSlash = (path: string) => path.replace(/\/+$/, "") || path;
