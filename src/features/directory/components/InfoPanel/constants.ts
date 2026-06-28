// Escape deselects the entry, which (since the panel needs a selection) closes it — so the

import { KEY } from "@/shared/constants";
import { formatBinding } from "@/shared/keymap";

// close button advertises Escape even though it isn't bound here.
export const CLOSE_HOTKEY = formatBinding({ keys: [KEY.ESCAPE] });
