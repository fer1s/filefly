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
  sidebarScrolled: boolean;
  setSidebarScrolled: (sidebarScrolled: boolean) => void;
  dirContent: DirEntry[];
  setDirContent: (dirContent: DirEntry[]) => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  search: string;
  setSearch: (search: string) => void;
  refreshDir: () => void;
};
