import { faFileZipper } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction, EntryActionSubItem } from "./types";

// Compress the selected entries into an archive. Opens a submenu of target formats (v1: .zip only;
// 7z/rar will be added here, gated on the system binary). Picking a format opens the compress
// dialog (name + level) via onCompress, which does the work and toasts the result.
export const compressAction: EntryAction = {
  id: ENTRY_ACTION.COMPRESS,
  label: () => t.contextMenu.compress,
  icon: faFileZipper,
  submenu: ({ targets, onCompress, onClose }): EntryActionSubItem[] => [
    {
      key: "zip",
      label: t.archive.toZip,
      icon: faFileZipper,
      onClick: () => {
        onClose();
        onCompress(targets);
      },
    },
  ],
};
