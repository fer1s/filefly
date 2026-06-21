type TimeSince = {
    nanos_since_epoch: number;
    secs_since_epoch: number;
}

type DiskUsage = {
    used: string;
    percentage: number;
}

type Volume = {
    name: string;
    mountPoint: string;
    availableSpace: string;
    totalSpace: string;
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