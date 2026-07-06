import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { pushRecentFolder } from "@/shared/services/api";

import { DOCK_ACTION } from "./constants";

type UseDockMenuArgs = {
  // Current folder path ("" = Volumes view).
  path: string;
  // Open a new tab, optionally at a given path (clones current when omitted).
  newTab: (path?: string) => void;
  // Home folder from settings ("" = Volumes view).
  homePath: string;
};

// Bridges the app to the custom macOS Dock right-click menu:
//   • feeds the app's own recent-folders list as the user navigates (backs the menu's "Recent
//     Folders" section — this is NOT Finder's / NSDocument recents), and
//   • handles clicks on Dock menu items (recent folder → open it; quick action → run it).
// On non-macOS platforms the backend commands/events are inert, so this is a harmless no-op.
export const useDockMenu = ({ path, newTab, homePath }: UseDockMenuArgs) => {
  // Record every real folder visit. Empty path is the Volumes view — not a folder, so skip it.
  useEffect(() => {
    if (path) void pushRecentFolder(path);
  }, [path]);

  // A recent-folder click opens that folder in a new tab (so the current one isn't lost).
  useEffect(() => {
    const unlisten = listen<string>("dock://navigate", (event) =>
      newTab(event.payload),
    );
    return () => {
      void unlisten.then((off) => off());
    };
  }, [newTab]);

  // A quick action opens the corresponding location in a new tab.
  useEffect(() => {
    const unlisten = listen<string>("dock://action", (event) => {
      switch (event.payload) {
        case DOCK_ACTION.NEW_TAB:
          newTab();
          break;
        case DOCK_ACTION.HOME:
          newTab(homePath || "");
          break;
        case DOCK_ACTION.VOLUMES:
          newTab("");
          break;
      }
    });
    return () => {
      void unlisten.then((off) => off());
    };
  }, [newTab, homePath]);
};
