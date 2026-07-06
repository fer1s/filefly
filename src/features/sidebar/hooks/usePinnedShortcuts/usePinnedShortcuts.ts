import { PINNED_ACTIONS, useHotkeys } from "@/shared/keymap";
import type { HotkeySpec } from "@/shared/keymap";

import type { UsePinnedShortcutsArgs } from "./types";

// Jump to a pinned folder by its slot hotkey (Cmd/Ctrl+1..6). Ignored while typing in inputs.
export const usePinnedShortcuts = ({
  pinned,
  setPath,
}: UsePinnedShortcutsArgs) => {
  const specs: HotkeySpec[] = pinned
    .slice(0, PINNED_ACTIONS.length)
    .map((item, i) => ({
      binding: PINNED_ACTIONS[i],
      handler: () => setPath(item.path),
    }));

  useHotkeys(specs);
};
