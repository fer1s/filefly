import {
  faFileCirclePlus,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { basename } from "@/shared/utils";

import { ENTRY_ACTION, TEXT_FILE_SUBMENU_KEY } from "./constants";
import type { EntryAction } from "./types";

// Create an empty, uniquely named text file inside the target folder, then reveal, select and
// rename it. The shared callback refreshes the current listing or navigates into a closed folder.
export const createFileAction: EntryAction = {
  id: ENTRY_ACTION.CREATE_FILE,
  label: () => t.contextMenu.createFile,
  icon: faFileCirclePlus,
  multiple: false,
  submenu: ({ fs, elementId, onEntryCreated }) => [
    {
      key: TEXT_FILE_SUBMENU_KEY,
      label: t.contextMenu.textFile,
      icon: faFileLines,
      onClick: async () => {
        try {
          const created = await fs.createTextFile(elementId);
          onEntryCreated(elementId, created);
          notify(
            t.directory.textFileCreated(basename(created)),
            TOAST_TYPE.SUCCESS,
          );
        } catch (err) {
          notify(t.errors.createTextFile(String(err)), TOAST_TYPE.ERROR);
        }
      },
    },
  ],
};
