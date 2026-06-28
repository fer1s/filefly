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
  file_type: Record<string, FileTypeRule>;
};

export type {
  TimeSince,
  DirEntry,
  DirMetadata,
  DiskUsage,
  Volume,
  NavHistory,
  Tab,
  ActionList,
  FileTypeRule,
  ContextMenuLayout,
};
