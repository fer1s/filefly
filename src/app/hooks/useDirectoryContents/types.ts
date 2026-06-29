import type { NavigateFunction } from "react-router-dom";

import type { FileSystemManager } from "@/shared/managers/FileSystemManager";

export type UseDirectoryContentsArgs = {
  fs: FileSystemManager;
  // Active folder ("" = the Volumes view).
  path: string;
  navigate: NavigateFunction;
  locationPathname: string;
  // Hide this app's own background files from the Recents listing.
  hideSystemRecents: boolean;
};
