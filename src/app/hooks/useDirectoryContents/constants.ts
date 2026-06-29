// Coalesce bursts of filesystem events (a single move fires several) into one refresh.
export const DIRECTORY_WATCH_DEBOUNCE_MS = 150;

// macOS mounts external disks here; watching it lets us refresh the volume list when one is
// attached or removed.
export const VOLUMES_MOUNT_DIR = "/Volumes";
