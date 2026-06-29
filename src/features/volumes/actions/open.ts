import { faFolderOpen } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { VOLUME_ACTION } from "./constants";
import type { VolumeAction } from "./types";

// Open the volume in the current tab (the view itself only opens on double-click).
export const openAction: VolumeAction = {
  id: VOLUME_ACTION.OPEN,
  label: () => t.contextMenu.open,
  icon: faFolderOpen,
  run: ({ path, setPath, onClose }) => {
    setPath(path);
    onClose();
  },
};
