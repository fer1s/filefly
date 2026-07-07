import { faClipboard } from "@fortawesome/free-solid-svg-icons";

import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Copy the targets' filesystem path(s) to the OS clipboard (one per line for a multi-selection).
export const copyPathAction: EntryAction = {
  id: ENTRY_ACTION.COPY_PATH,
  label: () => t.contextMenu.copyPath,
  icon: faClipboard,
  keymapAction: KEYMAP_ACTION.COPY_PATH,
  run: ({ fileOps, targets, onClose }) => {
    fileOps.copyPath(targets);
    onClose();
  },
};
