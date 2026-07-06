import * as api from "@/shared/services/api";
import { DirEntry, Volume, Tag } from "@/shared/models";
import type { DragDropAction } from "@/shared/constants";

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

  // Finder tags for a batch of paths, keyed by path (macOS only; empty on other platforms).
  getFileTags(paths: string[]): Promise<Record<string, Tag[]>> {
    return api.getFileTags(paths);
  }

  // Replace a file's Finder tags (macOS only; no-op elsewhere). Empty list clears them.
  setFileTags(path: string, tags: Tag[]): Promise<void> {
    return api.setFileTags(path, tags);
  }

  // Files carrying a given Finder tag (macOS only; empty elsewhere). Virtual listing for the
  // sidebar tag filter — like getRecentFiles, ordered as Spotlight returns them.
  findTagged(tag: string): Promise<DirEntry[]> {
    return api.findTagged(tag);
  }

  // Distinct Finder tags currently in use (macOS only; empty elsewhere), for the sidebar list.
  listAllTags(): Promise<Tag[]> {
    return api.listAllTags();
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

  // Start the recursive size-index watcher on `path` (empty path stops it). Keeps cached folder
  // sizes fresh in real time; live updates arrive via onDirSizeChanged.
  watchDirSizes(path: string): Promise<void> {
    return api.watchDirSizes(path);
  }

  // Subscribe to live folder-size updates; returns an unlisten function.
  onDirSizeChanged(
    onChange: (change: api.DirSizeChanged) => void,
  ): Promise<() => void> {
    return api.onDirSizeChanged(onChange);
  }

  getThumbnail(path: string, size: number): Promise<string> {
    return api.getThumbnail(path, size);
  }

  open(path: string): Promise<void> {
    return api.openFile(path);
  }

  // Resolve a path to something locally openable: a remote (sftp://) file is downloaded to the
  // cache and its local path returned; a local path is returned unchanged. Used before open/preview
  // so remote files reuse the local flow (read-only — see SSH_PLAN.md phase 3a).
  materialize(path: string): Promise<string> {
    return api.materializePath(path);
  }

  openInTerminal(path: string): Promise<void> {
    return api.openInTerminal(path);
  }

  // Render a markdown source string to HTML (renders the live editor draft, so unsaved edits show).
  renderMarkdown(content: string): Promise<string> {
    return api.renderMarkdown(content);
  }

  // Read a text file's raw contents (markdown source for the built-in editor).
  readText(path: string): Promise<string> {
    return api.readTextFile(path);
  }

  // Overwrite a text file with `content` (Cmd+S from the markdown editor).
  writeText(path: string, content: string): Promise<void> {
    return api.writeTextFile(path, content);
  }

  // Resolve to the final destination path (differs from destDir/basename on conflict-rename).
  copy(
    source: string,
    destDir: string,
    onProgress?: (progress: api.CopyProgress) => void,
  ): Promise<string> {
    return api.copyEntry(source, destDir, onProgress);
  }

  move(
    source: string,
    destDir: string,
    onProgress?: (progress: api.CopyProgress) => void,
  ): Promise<string> {
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

  // Start a native OS drag of real files, so they can be dropped into other apps (Finder, Mail, …)
  // and back into our own window. `mode` sets the OS drop-effect badge (move vs copy).
  startNativeDrag(paths: string[], icon?: string, mode?: DragDropAction): void {
    api.startNativeDrag(paths, icon, mode);
  }
}
