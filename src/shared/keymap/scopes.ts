// Hotkey scopes (layers). A scope is a context that can be active or not; the dispatcher resolves
// "which handler wins for this key" by precedence — the highest-precedence active scope consumes
// the event. GLOBAL is implicitly always active; the others are pushed/popped by the feature that
// owns them (see useHotkeyScope).
export const HOTKEY_SCOPE = {
  GLOBAL: "global", // always active; lowest precedence
  DIRECTORY: "directory", // a directory view is focused
  PREVIEW: "preview", // file preview open
  MENU: "menu", // a context menu open
  MODAL: "modal", // a dialog / confirmation open (highest precedence)
} as const;

export type HotkeyScope = (typeof HOTKEY_SCOPE)[keyof typeof HOTKEY_SCOPE];

// Base precedence (higher wins). Entries in the same scope tiebreak by priority, then by
// most-recently-registered (so the newest of several stacked MODALs / MENUs consumes the key —
// this is what gives the old Escape stack its LIFO behaviour).
export const SCOPE_PRECEDENCE: Record<HotkeyScope, number> = {
  global: 0,
  directory: 10,
  preview: 20,
  menu: 30,
  modal: 40,
};

// Scopes that fully capture input: while one is active, hotkeys in lower-precedence scopes don't
// fire at all (not just "lose" — they're suppressed). A modal dialog or an open context menu owns
// the keyboard, so nothing behind it (directory nav, clipboard, tab/zoom shortcuts) should react.
export const EXCLUSIVE_SCOPES: ReadonlySet<HotkeyScope> = new Set([
  HOTKEY_SCOPE.MENU,
  HOTKEY_SCOPE.MODAL,
]);
