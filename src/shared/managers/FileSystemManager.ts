import * as api from "@/shared/services/api";
import { DirEntry, Volume } from "@/shared/models";

// Encapsulates all filesystem domain operations. Views/components consume this through the provider
// instead of calling the Tauri service (`api`) directly. Also owns data shaping (filtering, sorting).
export class FileSystemManager {
  // List real volumes. macOS APFS exposes synthetic system volumes that duplicate Macintosh HD (/),
  // so they are filtered out. Sorted by mount point, with removable drives last.
  async listVolumes(): Promise<Volume[]> {
    const volumes = (await api.getVolumes()).filter(
      (v) => !v.mountPoint.startsWith("/System/Volumes/"),
    );

    volumes.sort((a, b) =>
      a.mountPoint < b.mountPoint ? -1 : a.mountPoint > b.mountPoint ? 1 : 0,
    );
    volumes.sort((a, b) =>
      a.isRemovable && !b.isRemovable
        ? 1
        : !a.isRemovable && b.isRemovable
          ? -1
          : 0,
    );

    return volumes;
  }

  // Read a directory, sorted by name with folders first.
  async readDirectory(path: string): Promise<DirEntry[]> {
    const files = await api.readDirectory(path);

    files.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    files.sort((a, b) =>
      a.metadata.isDir && !b.metadata.isDir
        ? -1
        : !a.metadata.isDir && b.metadata.isDir
          ? 1
          : 0,
    );

    return files;
  }

  // Finder-style recent files (already ordered newest-first by the backend). `hideAppFiles`
  // filters out this app's own background files (config/cache/temp).
  getRecentFiles(hideAppFiles: boolean): Promise<DirEntry[]> {
    return api.getRecentFiles(hideAppFiles);
  }

  // Recursively search under `path` for entries whose name contains `query`.
  searchDirectory(path: string, query: string): Promise<DirEntry[]> {
    return api.searchDirectory(path, query);
  }

  // Eject/unmount a removable volume by its mount point.
  ejectVolume(mountPoint: string): Promise<void> {
    return api.ejectVolume(mountPoint);
  }

  getEntry(path: string): Promise<DirEntry> {
    return api.getEntry(path);
  }

  // Probe whether a directory is actually writable (e.g. read-only NTFS detection).
  canWrite(path: string): Promise<boolean> {
    return api.canWrite(path);
  }

  // Open a URL in the default browser.
  openExternalUrl(url: string): Promise<void> {
    return api.openExternalUrl(url);
  }

  // Watch a directory for external changes; returns a function that stops watching.
  watchDirectory(path: string, onChange: () => void): Promise<() => void> {
    return api.watchDirectory(path, onChange);
  }

  // Per-folder zoom level (null when unset).
  getFolderZoom(path: string): Promise<number | null> {
    return api.getFolderZoom(path);
  }

  setFolderZoom(path: string, zoom: number): Promise<void> {
    return api.setFolderZoom(path, zoom);
  }

  getDirSize(path: string): Promise<number> {
    return api.getDirSize(path);
  }

  getThumbnail(path: string, size: number): Promise<string> {
    return api.getThumbnail(path, size);
  }

  open(path: string): Promise<void> {
    return api.openFile(path);
  }

  openInTerminal(path: string): Promise<void> {
    return api.openInTerminal(path);
  }

  markdownPreview(path: string): Promise<string> {
    return api.generateMarkdownPreview(path);
  }

  copy(
    source: string,
    destDir: string,
    onProgress?: (progress: api.CopyProgress) => void,
  ): Promise<void> {
    return api.copyEntry(source, destDir, onProgress);
  }

  move(
    source: string,
    destDir: string,
    onProgress?: (progress: api.CopyProgress) => void,
  ): Promise<void> {
    return api.moveEntry(source, destDir, onProgress);
  }

  rename(path: string, newName: string): Promise<void> {
    return api.renameEntry(path, newName);
  }

  // Create a new folder inside `parent`; resolves to the created folder's path.
  createFolder(parent: string): Promise<string> {
    return api.createFolder(parent);
  }

  // Copy an image file to the system clipboard.
  copyImage(path: string): Promise<void> {
    return api.copyImage(path);
  }

  trash(path: string): Promise<void> {
    return api.deleteEntry(path);
  }

  // Restore a trashed item to its recorded original location; resolves to the restored path, or
  // null when there's no record (the caller then asks the user where to put it).
  restoreTrashed(path: string): Promise<string | null> {
    return api.restoreTrashed(path);
  }

  // Permanently delete, bypassing the Trash (irreversible).
  deletePermanently(path: string): Promise<void> {
    return api.deleteEntryPermanently(path);
  }

  // Permanently empty the system Trash; resolves to the number of items removed.
  emptyTrash(): Promise<number> {
    return api.emptyTrash();
  }

  openFullDiskAccessSettings(): Promise<void> {
    return api.openFullDiskAccessSettings();
  }
}
