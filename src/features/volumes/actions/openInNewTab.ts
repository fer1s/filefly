import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { VOLUME_ACTION } from "./constants";
import type { VolumeAction } from "./types";

// Open the volume in a fresh tab and focus it.
export const openInNewTabAction: VolumeAction = {
  id: VOLUME_ACTION.OPEN_IN_NEW_TAB,
  label: () => t.contextMenu.openInNewTab,
  icon: faUpRightFromSquare,
  run: ({ path, openInNewTab, onClose }) => {
    openInNewTab(path);
    onClose();
  },
};
