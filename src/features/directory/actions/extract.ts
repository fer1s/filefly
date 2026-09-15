import { faBoxOpen } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import { archiveNeedsSevenzip } from "./utils";
import type { EntryAction } from "./types";

// "Extract Here": drop the archive's top-level entries directly beside it — a single-file archive
// yields just that file, a folder archive yields just that folder (mirroring what was compressed).
// Shown only for archive file types (see [file_type.archive] in context_menu.toml) the machine can
// open: non-zip formats (7z, rar) extract through 7-Zip, so without it they're hidden. Acts on the
// single clicked entry; hidden on multi-select.
export const extractAction: EntryAction = {
  id: ENTRY_ACTION.EXTRACT,
  label: () => t.contextMenu.extract,
  icon: faBoxOpen,
  multiple: false,
  isVisible: ({ elementId, sevenzipAvailable }) =>
    sevenzipAvailable || !archiveNeedsSevenzip(elementId),
  run: ({ elementId, onExtract, onClose }) => {
    onClose();
    onExtract(elementId);
  },
};
