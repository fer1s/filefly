import { useEffect, useState } from "react";
import {
  desktopDir,
  documentDir,
  downloadDir,
  homeDir,
  join,
  pictureDir,
} from "@tauri-apps/api/path";

import { t } from "@/lang";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faDesktop,
  faDownload,
  faFileLines,
  faHouse,
  faImage,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

import { MAX_PINNED_FOLDERS, TRASH_DIR_NAME } from "./constants";

import { SIDEBAR_ITEM_KIND, type SidebarItemKind } from "../../constants";
import type { SidebarPathItem } from "../../types";

// Resolve the standard user directories once and keep only the ones the OS reports.
export const usePinnedFolders = () => {
  const [pinned, setPinned] = useState<SidebarPathItem[]>([]);

  useEffect(() => {
    const resolvers: {
      name: string;
      icon: IconDefinition;
      kind: SidebarItemKind;
      resolve: () => Promise<string>;
    }[] = [
      {
        name: t.sidebar.home,
        icon: faHouse,
        kind: SIDEBAR_ITEM_KIND.FOLDER,
        resolve: homeDir,
      },
      {
        name: t.sidebar.desktop,
        icon: faDesktop,
        kind: SIDEBAR_ITEM_KIND.FOLDER,
        resolve: desktopDir,
      },
      {
        name: t.sidebar.documents,
        icon: faFileLines,
        kind: SIDEBAR_ITEM_KIND.FOLDER,
        resolve: documentDir,
      },
      {
        name: t.sidebar.downloads,
        icon: faDownload,
        kind: SIDEBAR_ITEM_KIND.FOLDER,
        resolve: downloadDir,
      },
      {
        name: t.sidebar.pictures,
        icon: faImage,
        kind: SIDEBAR_ITEM_KIND.FOLDER,
        resolve: pictureDir,
      },
      {
        name: t.sidebar.trash,
        icon: faTrash,
        kind: SIDEBAR_ITEM_KIND.TRASH,
        resolve: async () => join(await homeDir(), TRASH_DIR_NAME),
      },
    ];

    Promise.all(
      resolvers.map(async ({ name, icon, kind, resolve }) => {
        try {
          // Tauri returns these with a trailing slash; drop it so it matches the rest of the app's paths.
          const path = (await resolve()).replace(/\/+$/, "");
          return path ? { name, path, icon, kind } : null;
        } catch {
          return null;
        }
      }),
    ).then((items) =>
      setPinned(
        items
          .filter((item): item is SidebarPathItem => item !== null)
          .slice(0, MAX_PINNED_FOLDERS),
      ),
    );
  }, []);

  return pinned;
};
