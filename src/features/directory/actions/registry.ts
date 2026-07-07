import { ENTRY_ACTION, type EntryActionId } from "./constants";
import type { EntryAction } from "./types";

import { newFolderAction } from "./newFolder";
import { openAction } from "./open";
import { openInTerminalAction } from "./openInTerminal";
import { previewAction } from "./preview";
import { copyAction } from "./copy";
import { copyPathAction } from "./copyPath";
import { cutAction } from "./cut";
import { pasteAction } from "./paste";
import { renameAction } from "./rename";
import { trashAction } from "./trash";
import { restoreAction } from "./restore";
import { destroyAction } from "./destroy";
import { propertiesAction } from "./properties";
import { compressAction } from "./compress";
import { extractAction } from "./extract";
import { extractToFolderAction } from "./extractToFolder";
import { sortByAction } from "./sortBy";
import { toggleHiddenAction } from "./toggleHidden";

// Lookup from an action id (as written in context_menu.toml) to its predefined descriptor.
export const ENTRY_ACTIONS: Record<EntryActionId, EntryAction> = {
  [ENTRY_ACTION.NEW_FOLDER]: newFolderAction,
  [ENTRY_ACTION.OPEN]: openAction,
  [ENTRY_ACTION.OPEN_IN_TERMINAL]: openInTerminalAction,
  [ENTRY_ACTION.PREVIEW]: previewAction,
  [ENTRY_ACTION.COPY]: copyAction,
  [ENTRY_ACTION.COPY_PATH]: copyPathAction,
  [ENTRY_ACTION.CUT]: cutAction,
  [ENTRY_ACTION.PASTE]: pasteAction,
  [ENTRY_ACTION.RENAME]: renameAction,
  [ENTRY_ACTION.TRASH]: trashAction,
  [ENTRY_ACTION.RESTORE]: restoreAction,
  [ENTRY_ACTION.DESTROY]: destroyAction,
  [ENTRY_ACTION.PROPERTIES]: propertiesAction,
  [ENTRY_ACTION.COMPRESS]: compressAction,
  [ENTRY_ACTION.EXTRACT]: extractAction,
  [ENTRY_ACTION.EXTRACT_TO_FOLDER]: extractToFolderAction,
  [ENTRY_ACTION.SORT_BY]: sortByAction,
  [ENTRY_ACTION.TOGGLE_HIDDEN]: toggleHiddenAction,
};
