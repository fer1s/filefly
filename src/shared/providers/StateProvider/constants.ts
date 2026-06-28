import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import {
  VIEW_MODE,
  ZOOM_DEFAULT,
  DEFAULT_DATE_FORMAT,
  DEFAULT_SIDEBAR_OPACITY,
} from "@/shared/constants";

import type { State } from "./types";

// Default context value; also the seed used before the App provider mounts.
export const initialState: State = {
  fs: new FileSystemManager(),
  volumes: [],
  setVolumes: () => {},
  tabs: [],
  activeTabId: "",
  newTab: () => {},
  closeTab: () => {},
  selectTab: () => {},
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
  showHidden: false,
  toggleShowHidden: () => {},
  zoom: ZOOM_DEFAULT,
  zoomIn: () => {},
  zoomOut: () => {},
  setZoomTo: () => {},
  defaultZoom: ZOOM_DEFAULT,
  setDefaultZoom: () => {},
  dateFormat: DEFAULT_DATE_FORMAT,
  setDateFormat: () => {},
  sidebarOpacity: DEFAULT_SIDEBAR_OPACITY,
  setSidebarOpacity: () => {},
  search: "",
  setSearch: () => {},
  refreshDir: () => {},
  infoPanelOpen: false,
  toggleInfoPanel: () => {},
};
