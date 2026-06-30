import { faHardDrive } from "@fortawesome/free-solid-svg-icons";
import { faUsb } from "@fortawesome/free-brands-svg-icons";

import { DirEntry, Volume } from "@/shared/models";
import { TAGS_PREFIX } from "@/shared/constants";
import { classNames } from "./classNames";
import { activateOnKey } from "./activateOnKey";
import { formatDate, formatWithPattern } from "./date";

export const navigateToPath = (
  entry: DirEntry,
  setPath: (path: string) => void,
) => (entry.metadata.isDir ? setPath(entry.path) : "");

export const formatBytes = (bytes: number, decimals: number = 2) => {
  if (!+bytes) return "0 Bytes";

  // I'm scaried to touch this so i will leave it as it is...
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Last segment of a path (the file/folder name), handling "/" and "\" and trailing separators.
export const basename = (path: string) => {
  const segments = path.replace(/[\\/]+$/, "").split(/[\\/]/);
  return segments[segments.length - 1] || path;
};

// Lowercased file extension (no dot). Returns the whole name for dotless files.
export const extension = (name: string) =>
  (name.split(".").pop() || "").toLowerCase();

// Finder tag sentinel path helpers (see TAGS_PREFIX). `tags://Red` ⇄ "Red".
export const tagsPath = (tag: string) => `${TAGS_PREFIX}${tag}`;
export const isTagsPath = (path: string) => path.startsWith(TAGS_PREFIX);
export const tagFromPath = (path: string) => path.slice(TAGS_PREFIX.length);

// Icon for a volume: USB glyph for removable drives, hard-drive otherwise.
export const volumeIcon = (volume: Volume) =>
  volume.isRemovable ? faUsb : faHardDrive;

export { classNames, activateOnKey, formatDate, formatWithPattern };
