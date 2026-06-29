import { faTrashArrowUp } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Restore the targets out of the Trash: to their recorded original location, or — when we have no
// record — to a folder the user picks (see useFileOperations.restore).
export const restoreAction: EntryAction = {
  id: ENTRY_ACTION.RESTORE,
  label: () => t.contextMenu.restore,
  icon: faTrashArrowUp,
  run: async ({ fileOps, targets, onClose }) => {
    onClose();
    await fileOps.restore(targets);
  },
};
