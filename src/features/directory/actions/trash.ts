import { faTrash } from "@fortawesome/free-solid-svg-icons";

import { UI_COLOR } from "@/shared/constants";
import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Move the targets to the system Trash (reversible). Shown in the danger color.
export const trashAction: EntryAction = {
  id: ENTRY_ACTION.TRASH,
  label: () => t.contextMenu.delete,
  icon: faTrash,
  keymapAction: KEYMAP_ACTION.TRASH,
  color: UI_COLOR.DANGER,
  run: async ({ fileOps, targets, onClose }) => {
    onClose();
    await fileOps.remove(targets);
  },
};
