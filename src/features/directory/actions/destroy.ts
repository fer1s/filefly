import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { UI_COLOR } from "@/shared/constants";
import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Permanently delete the targets, bypassing the Trash (irreversible). Shown in the danger color.
export const destroyAction: EntryAction = {
  id: ENTRY_ACTION.DESTROY,
  label: () => t.contextMenu.deletePermanently,
  icon: faXmark,
  keymapAction: KEYMAP_ACTION.DELETE_PERMANENTLY,
  color: UI_COLOR.DANGER,
  run: async ({ fileOps, targets, onClose }) => {
    onClose();
    await fileOps.removePermanently(targets);
  },
};
