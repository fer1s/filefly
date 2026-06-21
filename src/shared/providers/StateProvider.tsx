import { createContext, useContext } from "react";

import { Volume, DirEntry } from "@/shared/models";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";

type State = {
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
  view: "list" | "grid";
  setView: (view: "list" | "grid") => void;
  search: string;
  setSearch: (search: string) => void;
  refreshDir: () => void;
};

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
  sidebarScrolled: false,
  setSidebarScrolled: () => {},
  dirContent: [],
  setDirContent: () => {},
  view: "grid",
  setView: () => {},
  search: "",
  setSearch: () => {},
  refreshDir: () => {},
};

const StateContext = createContext<State>(initialState);

export const StateProvider = StateContext.Provider;

export const useStateContext = () => useContext(StateContext);
