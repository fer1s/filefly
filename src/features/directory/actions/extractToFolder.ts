import { faFolderOpen } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import { archiveNeedsSevenzip } from "./utils";
import type { EntryAction } from "./types";

// "Extract to Folder": always wrap the output in a new subfolder beside the archive, named after it
// (the classic behaviour). Counterpart to [extractAction] ("Extract Here"). Shown only for archive
// file types the machine can open (non-zip needs 7-Zip, like Extract Here); single-select only.
export const extractToFolderAction: EntryAction = {
  id: ENTRY_ACTION.EXTRACT_TO_FOLDER,
  label: () => t.contextMenu.extractToFolder,
  icon: faFolderOpen,
  multiple: false,
  isVisible: ({ elementId, sevenzipAvailable }) =>
    sevenzipAvailable || !archiveNeedsSevenzip(elementId),
  run: ({ elementId, onExtractToFolder, onClose }) => {
    onClose();
    onExtractToFolder(elementId);
  },
};
