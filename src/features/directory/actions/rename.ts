import { faFilePen } from "@fortawesome/free-solid-svg-icons";

import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Start an inline rename of the clicked entry.
export const renameAction: EntryAction = {
  id: ENTRY_ACTION.RENAME,
  label: () => t.contextMenu.rename,
  icon: faFilePen,
  keymapAction: KEYMAP_ACTION.RENAME,
  run: ({ elementId, onStartRename, onClose }) => {
    onStartRename(elementId);
    onClose();
  },
};
