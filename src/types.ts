type TimeSince = {
    nanos_since_epoch: number;
    secs_since_epoch: number;
}

type DiskUsage = {
    used: number;
    percentage: number;
}

type Volume = {
    name: string;
    mountPoint: string;
    availableSpace: number;
    totalSpace: number;
    diskUsage: DiskUsage;
    isRemovable: boolean;
}

type DirMetadata = {
    isDir: boolean;
    isFile: boolean;
    modified: TimeSince;
    accessed: TimeSince;
    created: TimeSince;
}

type DirEntry = {
    name: string;
    path: string;
    size: number;
    metadata: DirMetadata;
}

export type {
    TimeSince,
    DirEntry,
    DirMetadata,
    DiskUsage,
    Volume,
}