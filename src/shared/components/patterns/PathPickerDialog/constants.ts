import {
  homeDir,
  desktopDir,
  documentDir,
  downloadDir,
} from "@tauri-apps/api/path";
import {
  faHouse,
  faDesktop,
  faFileLines,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// Wired to the dialog's aria-labelledby (points at the header title).
export const PATH_PICKER_TITLE_ID = "path-picker-title";

// macOS firmlink/internal volumes (the APFS data volume, Preboot, VM…) mount under here. They share
// the boot volume's name ("Macintosh HD") and aren't user-browsable, so hide them from Locations.
export const HIDDEN_MOUNT_PREFIX = "/System/Volumes/";

// The macOS-style "Favorites" shortcuts, in display order. Each maps to a standard user directory
// resolved at runtime (see utils.loadFavorites); missing ones are dropped.
export const FAVORITE_KEY = {
  HOME: "home",
  DESKTOP: "desktop",
  DOCUMENTS: "documents",
  DOWNLOADS: "downloads",
} as const;

export type FavoriteKey = (typeof FAVORITE_KEY)[keyof typeof FAVORITE_KEY];

// Display order of the favorites in the source list.
export const FAVORITE_ORDER: readonly FavoriteKey[] = [
  FAVORITE_KEY.HOME,
  FAVORITE_KEY.DESKTOP,
  FAVORITE_KEY.DOCUMENTS,
  FAVORITE_KEY.DOWNLOADS,
];

// Icon per favorite shortcut.
export const FAVORITE_ICON: Record<FavoriteKey, IconDefinition> = {
  [FAVORITE_KEY.HOME]: faHouse,
  [FAVORITE_KEY.DESKTOP]: faDesktop,
  [FAVORITE_KEY.DOCUMENTS]: faFileLines,
  [FAVORITE_KEY.DOWNLOADS]: faDownload,
};

// The standard user directory each favorite resolves to (via the Tauri path API), keyed by favorite.
export const FAVORITE_RESOLVER: Record<FavoriteKey, () => Promise<string>> = {
  [FAVORITE_KEY.HOME]: homeDir,
  [FAVORITE_KEY.DESKTOP]: desktopDir,
  [FAVORITE_KEY.DOCUMENTS]: documentDir,
  [FAVORITE_KEY.DOWNLOADS]: downloadDir,
};
