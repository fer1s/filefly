import { faFolderPlus } from "@fortawesome/free-solid-svg-icons";

import { notify, TOAST_TYPE } from "@/shared/toast";
import { KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Create a new folder in the current directory, then start an inline rename on it. Only
// offered on the directory background (nothing selected).
export const newFolderAction: EntryAction = {
  id: ENTRY_ACTION.NEW_FOLDER,
  label: () => t.contextMenu.newFolder,
  icon: faFolderPlus,
  keymapAction: KEYMAP_ACTION.NEW_FOLDER,
  run: async ({ fs, elementId, onStartRename, onClose }) => {
    onClose();
    try {
      const created = await fs.createFolder(elementId);
      onStartRename(created);
    } catch (err) {
      notify(t.errors.createFolder(String(err)), TOAST_TYPE.ERROR);
    }
  },
};
