import { faCopy } from "@fortawesome/free-solid-svg-icons";

import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Copy the targets to the internal clipboard.
export const copyAction: EntryAction = {
  id: ENTRY_ACTION.COPY,
  label: () => t.contextMenu.copy,
  icon: faCopy,
  keymapAction: KEYMAP_ACTION.COPY,
  run: ({ fileOps, targets, onClose }) => {
    fileOps.copy(targets);
    onClose();
  },
};
