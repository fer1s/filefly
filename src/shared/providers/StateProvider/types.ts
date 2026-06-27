import { Volume, DirEntry } from "@/shared/models";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { type ViewMode } from "@/shared/constants";

export type State = {
  fs: FileSystemManager;
  volumes: Volume[];
  setVolumes: (volumes: Volume[]) => void;
  path: string;
  setPath: (path: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  dirContent: DirEntry[];
  setDirContent: (dirContent: DirEntry[]) => void;
  // True when the current directory could not be read due to OS privacy protection
  // (e.g. macOS Full Disk Access required for the Trash).
  accessDenied: boolean;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  search: string;
  setSearch: (search: string) => void;
  refreshDir: () => void;
};
