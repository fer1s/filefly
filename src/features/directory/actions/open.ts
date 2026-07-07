import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

import { KEY } from "@/shared/constants";
import { ENTRY_KIND } from "@/features/directory/constants";
import { formatBinding } from "@/shared/keymap";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction } from "./types";

// Open a file — in the built-in preview when its type + settings route it there, otherwise the OS
// default app — or navigate into a directory. Bound to Enter via keyboard nav (fixed, not
// user-configurable), so its glyph is hardcoded.
export const openAction: EntryAction = {
  id: ENTRY_ACTION.OPEN,
  label: () => t.contextMenu.open,
  icon: faArrowUpRightFromSquare,
  hotkey: formatBinding({ keys: [KEY.ENTER] }),
  run: async ({
    fs,
    elementId,
    elementType,
    setPath,
    onClose,
    onPreview,
    opensInAppPreview,
  }) => {
    onClose();
    if (elementType === ENTRY_KIND.DIRECTORY) {
      setPath(elementId);
      return;
    }
    // Images/markdown open in the built-in preview when their setting is on (in-app or its own
    // window, decided by onPreview); everything else opens in the OS default app. Mirrors the
    // directory open flow so Enter, double-click, the context menu and the quick bar all agree.
    if (opensInAppPreview) {
      onPreview(elementId);
      return;
    }
    // Remote (sftp://) files download to the cache first so the OS app opens a local copy
    // (read-only — see SSH_PLAN.md); local paths pass through unchanged.
    fs.open(await fs.materialize(elementId));
  },
};
