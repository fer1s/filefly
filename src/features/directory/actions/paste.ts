import { faPaste } from "@fortawesome/free-solid-svg-icons";

import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Paste the clipboard into the current directory. Disabled when the clipboard is empty.
export const pasteAction: EntryAction = {
  id: ENTRY_ACTION.PASTE,
  label: () => t.contextMenu.paste,
  icon: faPaste,
  keymapAction: KEYMAP_ACTION.PASTE,
  isEnabled: ({ canPaste }) => canPaste,
  run: async ({ fileOps, onClose }) => {
    onClose();
    await fileOps.paste();
  },
};
