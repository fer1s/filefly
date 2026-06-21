import { useEffect, useState } from "react";
import {
  desktopDir,
  documentDir,
  downloadDir,
  homeDir,
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
} from "@fortawesome/free-solid-svg-icons";

import type { Pinned } from "../../types";

// Resolve the standard user directories once and keep only the ones the OS reports.
export const usePinnedFolders = () => {
  const [pinned, setPinned] = useState<Pinned[]>([]);

  useEffect(() => {
    const resolvers: {
      name: string;
      icon: IconDefinition;
      resolve: () => Promise<string>;
    }[] = [
      { name: t.sidebar.home, icon: faHouse, resolve: homeDir },
      { name: t.sidebar.desktop, icon: faDesktop, resolve: desktopDir },
      { name: t.sidebar.documents, icon: faFileLines, resolve: documentDir },
      { name: t.sidebar.downloads, icon: faDownload, resolve: downloadDir },
      { name: t.sidebar.pictures, icon: faImage, resolve: pictureDir },
    ];

    Promise.all(
      resolvers.map(async ({ name, icon, resolve }) => {
        try {
          // Tauri returns these with a trailing slash; drop it so it matches the rest of the app's paths.
          const path = (await resolve()).replace(/\/+$/, "");
          return path ? { name, path, icon } : null;
        } catch {
          return null;
        }
      }),
    ).then((items) =>
      setPinned(items.filter((item): item is Pinned => item !== null)),
    );
  }, []);

  return pinned;
};
