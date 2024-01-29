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
    modified: number;
    accessed: number;
    created: number;
}

export type DirEntry = {
    name: string;
    path: string;
    size: number;
    metadata: DirMetadata;
}