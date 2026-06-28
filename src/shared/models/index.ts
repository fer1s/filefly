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
  ActionList,
  FileTypeRule,
  ContextMenuLayout,
};
