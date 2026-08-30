import { faFolderOpen } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";
import { dirname } from "@/shared/utils";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Results in Recents and recursive searches can live outside the directory currently in view.
// Open the clicked result's real parent in a fresh tab so the current results stay intact.
export const openContainingFolderAction: EntryAction = {
  id: ENTRY_ACTION.OPEN_CONTAINING_FOLDER,
  label: () => t.contextMenu.openContainingFolder,
  icon: faFolderOpen,
  multiple: false,
  isVisible: ({ isDispersedView, isCurrentDirectory }) =>
    isDispersedView && !isCurrentDirectory,
  run: ({ elementId, openInNewTab, onClose }) => {
    const parent = dirname(elementId);
    // dirname intentionally uses "" for top-level navigation in much of the app; here an absolute
    // root child's real container is "/", not the Volumes view represented by "".
    openInNewTab(parent || (elementId.startsWith("/") ? "/" : parent));
    onClose();
  },
};
