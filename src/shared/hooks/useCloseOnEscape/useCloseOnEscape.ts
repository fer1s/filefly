import { KEY } from "@/shared/constants";
import { HOTKEY_SCOPE, useHotkey, useHotkeyScope } from "@/shared/keymap";

// Calls `onClose` when Escape is pressed while `active`, but only for the topmost active handler —
// the universal cancel for dialogs/popups/modes. A thin wrapper over the hotkey dispatcher: each
// active instance registers an Escape hotkey in the MODAL scope and activates that scope. The old
// LIFO behaviour falls out of scope precedence + "most-recently-registered wins" (newest modal
// closes first), and the dispatcher's preventDefault/stopPropagation keeps background handlers
// (directory selection, sidebar edit mode, …) from also reacting.
export const useCloseOnEscape = (active: boolean, onClose: () => void) => {
  useHotkeyScope(HOTKEY_SCOPE.MODAL, active);
  useHotkey({ keys: [KEY.ESCAPE] }, onClose, {
    scope: HOTKEY_SCOPE.MODAL,
    when: active,
  });
};
