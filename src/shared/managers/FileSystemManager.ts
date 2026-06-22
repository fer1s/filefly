import * as api from "@/shared/services/api";
import { DirEntry, Volume } from "@/shared/models";

// Encapsulates all filesystem domain operations. Views/components consume this through the provider
// instead of calling the Tauri service (`api`) directly. Also owns data shaping (filtering, sorting).
export class FileSystemManager {
  getHostName(): Promise<string | null> {
    return api.getHostName();
  }

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

  getEntry(path: string): Promise<DirEntry> {
    return api.getEntry(path);
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

  copy(source: string, destDir: string): Promise<void> {
    return api.copyEntry(source, destDir);
  }

  move(source: string, destDir: string): Promise<void> {
    return api.moveEntry(source, destDir);
  }

  rename(path: string, newName: string): Promise<void> {
    return api.renameEntry(path, newName);
  }

  trash(path: string): Promise<void> {
    return api.deleteEntry(path);
  }
}
