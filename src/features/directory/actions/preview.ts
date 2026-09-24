import { faEye } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Open the in-app preview for the clicked file. Not generic — only the file types that
// declare it in context_menu.toml expose this action.
export const previewAction: EntryAction = {
  id: ENTRY_ACTION.PREVIEW,
  label: () => t.common.preview,
  icon: faEye,
  // Redundant when opening the entry already launches the in-app preview — hide it then.
  isVisible: ({ opensInAppPreview }) => !opensInAppPreview,
  run: ({ elementId, onPreview, onClose }) => {
    onPreview(elementId);
    onClose();
  },
};
