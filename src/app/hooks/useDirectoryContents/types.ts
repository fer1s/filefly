import type { NavigateFunction } from "react-router";

import type { FileSystemManager } from "@/shared/managers/FileSystemManager";

export type UseDirectoryContentsArgs = {
  fs: FileSystemManager;
  // Active folder ("" = the Volumes view).
  path: string;
  navigate: NavigateFunction;
  locationPathname: string;
  // Hide this app's own background files from the Recents listing.
  hideSystemRecents: boolean;
  // Leave a local folder immediately when the OS denies access to it.
  onAccessDenied: () => void;
};
