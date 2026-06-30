# Hotkey Dispatcher Plan (Option C — Scoped, Data-Driven Dispatch)

## Goal

Replace the scattered, ad-hoc keyboard handling with **one centralized, scope-aware hotkey
dispatcher**. Today every feature mounts its own `document.addEventListener("keydown", …)` and
resolves conflicts by accident (registration order + `capture` + `stopPropagation` hacks). This is
what caused the Escape bug (a confirmation dialog's Escape also exited sidebar edit mode and
cleared the file selection).

The honest framing: we cannot eliminate the decision "which handler wins for this key" — that is
inherently conditional. We **can** move it out of N scattered imperative `if`s into **one
resolver + per-handler metadata (scope + priority)**. Hotkeys become data; precedence becomes a
single policy.

This plan keeps the existing keymap system (`KEYMAP_ACTION`, `keymap.toml`, `matchesBinding`,
`formatBinding`) and layers a dispatcher on top of it.

---

## Current State (inventory)

Already present and reused as-is:

- `KEYMAP_ACTION` const-enum + `keymap.toml` (rebindable actions).
- `matchesBinding(event, binding)` — the matching primitive.
- `formatBinding` — glyph rendering (tooltips/help).
- `KeymapProvider` / `useKeymap` — loads keymap, exposes `keymap` + `setBinding`.
- `ESCAPE_HOTKEY` / `SPACE_HOTKEY` — fixed (non-rebindable) hotkeys.

Global `keydown` listeners to migrate (each its own listener + `if`):

| Handler                                            | Intent                            | Target scope       |
| -------------------------------------------------- | --------------------------------- | ------------------ |
| `useSidebarShortcuts`                              | toggle sidebar                    | GLOBAL             |
| `usePinnedShortcuts`                               | jump to pinned folders            | GLOBAL             |
| `useTabsShortcuts`                                 | new/close/switch tab              | GLOBAL             |
| `useSettingsShortcut`                              | open settings                     | GLOBAL             |
| `usePathBarShortcuts`                              | focus/nav path bar                | GLOBAL             |
| `useZoomShortcuts`                                 | zoom in/out                       | DIRECTORY          |
| `useClipboardShortcuts`                            | copy/cut/paste                    | DIRECTORY          |
| `useKeyboardNav` (capture)                         | arrows / Enter / Escape selection | DIRECTORY          |
| `Preview`                                          | prev/next / Escape                | PREVIEW            |
| `AudioPreview`                                     | media keys                        | PREVIEW (or MEDIA) |
| `useContextMenu` / `useContextMenuState` (capture) | close on Escape / outside         | MENU               |
| `useCloseOnEscape` (stack)                         | cancel modals / edit mode         | MODAL (per layer)  |
| `Tooltip`                                          | hide on Escape                    | TOOLTIP            |
| `useToasts`                                        | dismiss on Escape                 | TOAST              |

Stays component-local (NOT migrated — these are bound to a specific input element, not the
document): `useSectionRename`, `useInlineRename`, `PathSearch`, `PathInput` (their `onKeyDown` is on
the focused input and must keep working there).

---

## Design

### 1. Scopes (layers)

A scope = a context that can be active or not. Precedence is **topmost active scope wins**, modelled
as an active-scope **stack** (the Escape stack generalized).

```ts
// shared/keymap/scopes.ts
export const HOTKEY_SCOPE = {
  GLOBAL: "global", // always active; lowest precedence
  DIRECTORY: "directory", // a directory view is focused
  PREVIEW: "preview", // file preview open
  MENU: "menu", // a context menu open
  MODAL: "modal", // a dialog / confirmation open (highest precedence)
} as const;
export type HotkeyScope = (typeof HOTKEY_SCOPE)[keyof typeof HOTKEY_SCOPE];

// Base precedence (higher = wins). MODAL layers also stack among themselves by open order.
export const SCOPE_PRECEDENCE: Record<HotkeyScope, number> = {
  global: 0,
  directory: 10,
  preview: 20,
  menu: 30,
  modal: 40,
};
```

`GLOBAL` is implicitly always active. The others are pushed/popped by the feature that owns them.

### 2. Registry + active-scope state (provider)

Extend the keymap layer with a `HotkeyProvider` (can live alongside `KeymapProvider`, or merge into
it). It owns:

- `registry`: a list of `{ id, action?, hotkey?, scope, priority, allowInInput, handler }`.
- `activeScopes`: an ordered stack of `{ scope, token }` (so nested MODALs stack correctly).
- **one** `window` `keydown` listener in the **capture** phase (runs before any leftover
  document-capture handler during migration).

```ts
type HotkeyEntry = {
  id: number;
  action?: KeymapAction; // resolved against the live keymap (rebindable)
  hotkey?: KeyBinding; // fixed binding (e.g. Escape, arrows) when not a keymap action
  scope: HotkeyScope;
  priority: number; // tiebreak within a scope (default 0)
  allowInInput: boolean; // default false → ignored while typing in input/textarea/CE
  handler: (e: KeyboardEvent) => void | boolean; // return false → "didn't handle, fall through"
};
```

### 3. Public API (hooks)

```ts
// Register a hotkey for as long as the component is mounted (and `when` is true).
useHotkey(KEYMAP_ACTION.TOGGLE_SIDEBAR, onToggle, {
  scope: HOTKEY_SCOPE.GLOBAL,
});

// Fixed (non-rebindable) binding:
useHotkey({ keys: [KEY.ESCAPE] }, onClose, { scope: HOTKEY_SCOPE.MODAL });

// Activate a scope while a condition holds (pushes/pops the scope stack):
useHotkeyScope(HOTKEY_SCOPE.MODAL, isOpen);
useHotkeyScope(HOTKEY_SCOPE.DIRECTORY, true); // directory view mounts it
```

`useCloseOnEscape(active, onClose)` is reimplemented as a thin wrapper:
`useHotkey({keys:[ESCAPE]}, onClose, { scope: MODAL })` + `useHotkeyScope(MODAL, active)`. The
current LIFO behaviour falls out of scope precedence + per-layer stacking.

### 4. Resolution algorithm (single listener)

On `keydown` (capture, on `window`):

1. If the event target is an editable element (`input`/`textarea`/`[contenteditable]`), keep only
   entries with `allowInInput: true`.
2. Determine the **highest-precedence active scope** present in the registry's matching entries
   (active scopes = `GLOBAL` ∪ the `activeScopes` stack; ties broken by stack order, newest first).
3. Among entries in that scope whose `action`/`hotkey` `matchesBinding(event)`, pick the highest
   `priority` (then most-recently-registered).
4. Run its `handler`.
   - If it returns `false` (explicitly "not handled"), continue to the next-best candidate /
     lower scope (opt-in passthrough).
   - Otherwise `event.preventDefault()` + `event.stopPropagation()` and stop.
5. No match → do nothing (event proceeds normally).

The input guard, `preventDefault`, and `stopPropagation` now live **once**, here.

---

## Files

**New** (`src/shared/keymap/`):

- `scopes.ts` — `HOTKEY_SCOPE`, `SCOPE_PRECEDENCE`, types.
- `providers/HotkeyProvider.tsx` + `HotkeyContext.ts` — registry, active-scope stack, the single
  listener, the resolver.
- `hooks/useHotkey/useHotkey.ts` (+ `index.ts`) — register one hotkey.
- `hooks/useHotkeyScope/useHotkeyScope.ts` (+ `index.ts`) — push/pop a scope.
- `dispatch.ts` — pure resolver (`resolve(event, registry, activeScopes, isMac)`) so it's unit
  testable without React.

**Changed:**

- `shared/keymap/index.ts` — export the new API.
- `shared/hooks/useCloseOnEscape/useCloseOnEscape.ts` — reimplement on top of `useHotkey`.
- `app/` provider wiring — mount `HotkeyProvider` inside `KeymapProvider` (needs the live keymap).
- Each migrated hook (table above) — drop its `addEventListener` + `if`, call `useHotkey`.

---

## Migration Phases (incremental, non-breaking)

Each phase ships independently; the old listeners keep working until migrated (the dispatcher's
`window`-capture listener + `stopPropagation` means migrated handlers already win over not-yet-
migrated document listeners, so order of migration is safe).

1. **Core.** Add `scopes.ts`, `dispatch.ts` (+ tests), `HotkeyProvider`, `useHotkey`,
   `useHotkeyScope`. Wire the provider. No behaviour change yet.
2. **Escape consolidation.** Reimplement `useCloseOnEscape` via `useHotkey`/`MODAL`. Verify the
   reported bug stays fixed (confirm-dialog Escape closes only the dialog; no deselect; no
   edit-mode exit). Migrate `useContextMenuState` Escape and `Tooltip`/`useToasts` Escape.
3. **GLOBAL hotkeys.** Migrate `useSidebarShortcuts`, `usePinnedShortcuts`, `useTabsShortcuts`,
   `useSettingsShortcut`, `usePathBarShortcuts`.
4. **DIRECTORY scope.** Mount `useHotkeyScope(DIRECTORY, …)` in the directory view; migrate
   `useKeyboardNav`, `useClipboardShortcuts`, `useZoomShortcuts`. Removes the
   capture-before-PathBar hack.
5. **PREVIEW scope.** Migrate `Preview` + `AudioPreview`; `useHotkeyScope(PREVIEW, previewOpen)`.
6. **Cleanup.** Delete dead listeners, dedupe the input guards, document the scope model.

---

## Edge Cases & Decisions

- **Passthrough.** Default: topmost matching scope consumes the key. `useKeyboardNav`'s "Escape
  deselects first, then falls through to exit preview/fullscreen" becomes a handler that returns
  `false` when there's nothing to clear → next scope handles it. Keep this opt-in.
- **Input guard.** Centralized; `allowInInput` opts a hotkey in (e.g. a global Cmd+number tab
  switch may still want to fire while focus is in a field — decide per action).
- **`mod` digits on macOS.** Already handled by `matchesBinding` (digit `code` fallback); the
  dispatcher reuses it unchanged.
- **Capture vs bubble during migration.** The dispatcher listens on `window` capture so it beats
  leftover `document` listeners. Once everything is migrated, capture is still fine.
- **Multiple MODALs.** Stack by open order; newest wins (generalizes today's Escape stack).
- **Non-keyboard cancels.** Outside-click closing (context menu, sidebar edit mode) is NOT part of
  this; it stays as-is (separate concern from key dispatch).

## Open Questions

1. Merge `HotkeyProvider` into `KeymapProvider`, or keep separate? (Lean: separate file, same
   subtree — keymap = data, hotkey = dispatch.)
2. Is `MEDIA` a distinct scope or just `PREVIEW`? (Lean: fold into `PREVIEW` unless a media-only
   surface appears.)
3. Do any GLOBAL hotkeys need `allowInInput` (fire while typing)? Audit during phase 3.

## Verification

- Unit-test `dispatch.ts` (pure resolver): scope precedence, input guard, passthrough, digit
  matching. No DOM needed.
- Manual: the Escape bug scenario; Cmd/Ctrl+number tabs; arrows in a directory while a dialog is
  open (must NOT navigate); zoom; copy/paste; preview nav.
- `tsc --noEmit` + `eslint` clean after each phase.
