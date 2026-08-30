import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Open the clicked folder in a fresh tab and focus it.
export const openInNewTabAction: EntryAction = {
  id: ENTRY_ACTION.OPEN_IN_NEW_TAB,
  label: () => t.contextMenu.openInNewTab,
  icon: faUpRightFromSquare,
  run: ({ elementId, openInNewTab, onClose }) => {
    openInNewTab(elementId);
    onClose();
  },
};
