import { faFileZipper } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction, EntryActionSubItem } from "./types";

// Compress the selected entries into an archive. Opens a submenu of target formats: .zip always
// (pure-Rust), plus .7z when a 7-Zip binary is on PATH. Picking a format opens the compress dialog
// (name + level + password) via onCompress, which does the work and toasts the result.
export const compressAction: EntryAction = {
  id: ENTRY_ACTION.COMPRESS,
  label: () => t.contextMenu.compress,
  icon: faFileZipper,
  submenu: ({
    targets,
    onCompress,
    onClose,
    sevenzipAvailable,
  }): EntryActionSubItem[] => {
    const items: EntryActionSubItem[] = [
      {
        key: "zip",
        label: t.archive.toZip,
        icon: faFileZipper,
        onClick: () => {
          onClose();
          onCompress(targets, "zip");
        },
      },
    ];
    if (sevenzipAvailable) {
      items.push({
        key: "7z",
        label: t.archive.to7z,
        icon: faFileZipper,
        onClick: () => {
          onClose();
          onCompress(targets, "7z");
        },
      });
    }
    return items;
  },
};
