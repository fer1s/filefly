import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { VIEW_MODE } from "@/shared/constants";

import type { State } from "./types";

// Default context value; also the seed used before the App provider mounts.
export const initialState: State = {
  fs: new FileSystemManager(),
  volumes: [],
  setVolumes: () => {},
  path: "",
  setPath: () => {},
  canGoBack: false,
  canGoForward: false,
  goBack: () => {},
  goForward: () => {},
  dirContent: [],
  setDirContent: () => {},
  accessDenied: false,
  view: VIEW_MODE.GRID,
  setView: () => {},
  search: "",
  setSearch: () => {},
  refreshDir: () => {},
};
