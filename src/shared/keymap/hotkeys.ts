import { KEY } from "@/shared/constants";

import { formatBinding } from "./utils";

// Escape glyph for "close/cancel" affordances (dialogs, popups, preview). Escape is a fixed
// universal cancel — not user-rebindable — so it lives here rather than in the keymap.
export const ESCAPE_HOTKEY = formatBinding({ keys: [KEY.ESCAPE] });
