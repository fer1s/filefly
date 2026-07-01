import { formatBinding, type Keymap } from "@/shared/keymap";

import type { ShortcutRow } from "./constants";

// Display string for a row's binding(s): a single glyph, or "first … last" for a slot range
// (e.g. the per-position tab / pinned-folder hotkeys). Unbound actions contribute nothing.
export const formatRowKeys = (row: ShortcutRow, keymap: Keymap): string => {
  const glyphs = row.actions
    .map((action) => formatBinding(keymap[action]))
    .filter(Boolean);

  if (glyphs.length <= 1) return glyphs[0] ?? "";
  return `${glyphs[0]} … ${glyphs[glyphs.length - 1]}`;
};
