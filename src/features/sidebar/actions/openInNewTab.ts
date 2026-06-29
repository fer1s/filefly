import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { SIDEBAR_ACTION } from "./constants";
import type { SidebarAction } from "./types";

// Open the row's location in a fresh tab and focus it.
export const openInNewTabAction: SidebarAction = {
  id: SIDEBAR_ACTION.OPEN_IN_NEW_TAB,
  label: () => t.contextMenu.openInNewTab,
  icon: faUpRightFromSquare,
  run: ({ path, openInNewTab, onClose }) => {
    openInNewTab(path);
    onClose();
  },
};
