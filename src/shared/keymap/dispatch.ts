import { HOTKEY_SCOPE, SCOPE_PRECEDENCE } from "./scopes";
import type { HotkeyScope } from "./scopes";
import type { HotkeyEntry, Keymap } from "./types";
import { matchesBinding } from "./utils";

// Pure hotkey resolver — no React, no DOM mutation — so the precedence policy is testable in
// isolation. Given a keyboard event and the current registry + active scopes, it returns the
// matching entries ordered best-first. The caller runs them in order until one consumes the event
// (its handler returns anything but `false`).

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
};

const entryMatches = (
  entry: HotkeyEntry,
  event: KeyboardEvent,
  keymap: Keymap,
): boolean =>
  entry.action
    ? matchesBinding(event, keymap[entry.action])
    : matchesBinding(event, entry.hotkey);

export const resolve = (
  event: KeyboardEvent,
  registry: HotkeyEntry[],
  activeScopes: Set<HotkeyScope>,
  keymap: Keymap,
): HotkeyEntry[] => {
  const editable = isEditableTarget(event.target);
  return registry
    .filter((e) => e.scope === HOTKEY_SCOPE.GLOBAL || activeScopes.has(e.scope))
    .filter((e) => !editable || e.allowInInput)
    .filter((e) => entryMatches(e, event, keymap))
    .sort(
      (a, b) =>
        SCOPE_PRECEDENCE[b.scope] - SCOPE_PRECEDENCE[a.scope] ||
        b.priority - a.priority ||
        b.id - a.id, // most-recently-registered wins within a scope (LIFO for stacked layers)
    );
};
