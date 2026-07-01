import { faScissors } from "@fortawesome/free-solid-svg-icons";

import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Cut the targets to the internal clipboard (moved on paste).
export const cutAction: EntryAction = {
  id: ENTRY_ACTION.CUT,
  label: () => t.contextMenu.cut,
  icon: faScissors,
  keymapAction: KEYMAP_ACTION.CUT,
  run: ({ fileOps, targets, onClose }) => {
    fileOps.cut(targets);
    onClose();
  },
};
