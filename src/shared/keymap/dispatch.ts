import { resolveHotkeys } from "@sito/commands";

import { HOTKEY_CONFIG } from "./scopes";
import type { HotkeyScope } from "./scopes";
import type { HotkeyEntry, Keymap } from "./types";

// Pure hotkey resolver — no React, no DOM mutation — so the precedence policy is testable in
// isolation. Given a keyboard event and the current registry + active scopes, it returns the
// matching entries ordered best-first. The caller runs them in order until one consumes the event
// (its handler returns anything but `false`).

export const resolve = (
  event: KeyboardEvent,
  registry: HotkeyEntry[],
  activeScopes: Set<HotkeyScope>,
  keymap: Keymap,
): HotkeyEntry[] =>
  resolveHotkeys(event, registry, activeScopes, keymap, HOTKEY_CONFIG);
