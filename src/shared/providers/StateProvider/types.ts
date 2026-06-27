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
  // Whether hidden entries (dotfiles) are shown in the listing. Toggled via the keymap.
  showHidden: boolean;
  toggleShowHidden: () => void;
  // Directory zoom multiplier (1 = 100%), persisted per folder.
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  search: string;
  setSearch: (search: string) => void;
  refreshDir: () => void;
};
