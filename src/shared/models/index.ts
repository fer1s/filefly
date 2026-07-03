import type { SearchFilters } from "@/shared/search/filters";

type TimeSince = {
  nanos_since_epoch: number;
  secs_since_epoch: number;
};

type DiskUsage = {
  used: string;
  percentage: number;
};

type Volume = {
  name: string;
  mountPoint: string;
  availableSpace: string;
  totalSpace: string;
  diskUsage: DiskUsage;
  isRemovable: boolean;
  // Whether the volume can be ejected/unmounted (removable media, or anything under /Volumes —
  // external disks, disk images, extra partitions). Drives the Eject action; isRemovable drives
  // the USB icon / "Removable" label / sort order.
  isEjectable: boolean;
  // Lowercased filesystem type (e.g. "ntfs", "apfs", "exfat").
  fileSystem: string;
  // Raw byte counts (the *Space fields above are pre-formatted strings).
  totalBytes: number;
  availableBytes: number;
};

type DirMetadata = {
  isDir: boolean;
  isFile: boolean;
  modified: TimeSince;
  accessed: TimeSince;
  created: TimeSince;
};

type DirEntry = {
  name: string;
  path: string;
  size: number;
  sizeOnDisk: number;
  metadata: DirMetadata;
};

// A macOS Finder tag: a name plus a colour index (0 = no colour; 1..=7 = the standard Finder
// colours — gray, green, purple, blue, yellow, red, orange). Empty on non-macOS platforms.
type Tag = {
  name: string;
  color: number;
};

// A browser tab: its own back/forward navigation history and its own search query. The current
// path is the entry at `history.index` in `history.stack`.
type NavHistory = {
  stack: string[];
  index: number;
};

type Tab = {
  id: string;
  history: NavHistory;
  search: string;
  // Filters narrowing this tab's search results (kind/date/size/scope). Reset when the search or
  // location changes, like `search`.
  filters: SearchFilters;
  // Whether the right info panel is open in this tab (each tab keeps its own state).
  infoPanelOpen: boolean;
};

// Context-menu layout loaded from context_menu.toml: which actions appear per entry kind.
type ActionList = { actions: string[] };
type FileTypeRule = { extensions: string[]; actions: string[] };
type ContextMenuLayout = {
  directory: ActionList;
  folder: ActionList;
  file: ActionList;
  // Entries shown while browsing the Trash (Restore / permanent delete instead of Move-to-Trash).
  trash: ActionList;
  file_type: Record<string, FileTypeRule>;
};

export type {
  TimeSince,
  DirEntry,
  Tag,
  DirMetadata,
  DiskUsage,
  Volume,
  NavHistory,
  Tab,
  ActionList,
  FileTypeRule,
  ContextMenuLayout,
};
