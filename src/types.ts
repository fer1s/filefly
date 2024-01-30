export type TimeSince = {
    nanos_since_epoch: number;
    secs_since_epoch: number;
}

export type DiskUsage = {
    used: number;
    percentage: number;
}

export type Volume = {
    name: string;
    mountPoint: string;
    availableSpace: number;
    totalSpace: number;
    diskUsage: DiskUsage;
    isRemovable: boolean;
}

export type DirMetadata = {
    isDir: boolean;
    isFile: boolean;
    modified: TimeSince;
    accessed: TimeSince;
    created: TimeSince;
}

export type DirEntry = {
    name: string;
    path: string;
    size: number;
    metadata: DirMetadata;
}