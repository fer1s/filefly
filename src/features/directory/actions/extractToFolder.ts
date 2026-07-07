import { faFolderOpen } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// "Extract to Folder": always wrap the output in a new subfolder beside the archive, named after it
// (the classic behaviour). Counterpart to [extractAction] ("Extract Here"). Shown only for archive
// file types; single-select only.
export const extractToFolderAction: EntryAction = {
  id: ENTRY_ACTION.EXTRACT_TO_FOLDER,
  label: () => t.contextMenu.extractToFolder,
  icon: faFolderOpen,
  multiple: false,
  run: ({ elementId, onExtractToFolder, onClose }) => {
    onClose();
    onExtractToFolder(elementId);
  },
};
