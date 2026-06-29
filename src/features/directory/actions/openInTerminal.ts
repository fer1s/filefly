import { faTerminal } from "@fortawesome/free-solid-svg-icons";

import { ENTRY_KIND } from "@/shared/constants";
import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Open a terminal at the folder: the folder itself (or the current directory), or a file's
// parent directory. Not generic — only meaningful for folder/directory contexts.
export const openInTerminalAction: EntryAction = {
  id: ENTRY_ACTION.OPEN_IN_TERMINAL,
  label: () => t.contextMenu.openInTerminal,
  icon: faTerminal,
  keymapAction: KEYMAP_ACTION.OPEN_IN_TERMINAL,
  run: ({ fs, elementId, elementType, onClose }) => {
    if (elementType === ENTRY_KIND.FILE)
      fs.openInTerminal(elementId.split("/").slice(0, -1).join("/"));
    else fs.openInTerminal(elementId);
    onClose();
  },
};
