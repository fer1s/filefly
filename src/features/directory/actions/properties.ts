import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Open the properties panel for the clicked entry (or the current directory).
export const propertiesAction: EntryAction = {
  id: ENTRY_ACTION.PROPERTIES,
  label: () => t.contextMenu.properties,
  icon: faCircleInfo,
  run: async ({ elementId, isCurrentDirectory, onProperties, onClose }) => {
    onClose();
    await onProperties(elementId, isCurrentDirectory);
  },
};
