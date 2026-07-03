import { faEye } from "@fortawesome/free-solid-svg-icons";

import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Toggle the global "show hidden entries" (dotfiles) setting. A trailing check reflects the
// current state. Not per-folder — flips the app-wide toggle (see StateProvider.showHidden).
export const toggleHiddenAction: EntryAction = {
  id: ENTRY_ACTION.TOGGLE_HIDDEN,
  label: () => t.contextMenu.showHidden,
  icon: faEye,
  keymapAction: KEYMAP_ACTION.TOGGLE_HIDDEN,
  checked: ({ showHidden }) => showHidden,
  run: ({ toggleShowHidden, onClose }) => {
    toggleShowHidden();
    onClose();
  },
};
