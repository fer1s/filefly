import { useEffect, useLayoutEffect, useRef } from "react";

import type { KeymapAction } from "../../constants";
import { HOTKEY_SCOPE } from "../../scopes";
import type { HotkeyHandler, HotkeyOptions, KeyBinding } from "../../types";
import { useHotkeyContext } from "../../providers/HotkeyContext";

// Register a hotkey for as long as the component is mounted (and `when` is true). `binding` is
// either a KeymapAction (resolved live against the rebindable keymap) or a fixed KeyBinding
// (non-rebindable, e.g. Escape / arrows).
export const useHotkey = (
  binding: KeymapAction | KeyBinding,
  handler: HotkeyHandler,
  options: HotkeyOptions = {},
) => {
  const { register } = useHotkeyContext();

  // Keep the latest handler without re-registering on every render. Synced in a layout effect
  // (before paint) so the dispatcher never reads a stale handler.
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  const {
    scope = HOTKEY_SCOPE.GLOBAL,
    priority = 0,
    allowInInput = false,
    when = true,
  } = options;

  const isAction = typeof binding === "string";
  const action = isAction ? binding : undefined;
  const hotkey = isAction ? undefined : binding;
  // Stable dep for the object binding so the effect re-runs only on a real change.
  const hotkeyKey = isAction ? "" : JSON.stringify(hotkey);

  useEffect(() => {
    if (!when) return;
    return register({
      action,
      hotkey,
      scope,
      priority,
      allowInInput,
      handler: (e) => handlerRef.current(e),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, when, action, hotkeyKey, scope, priority, allowInInput]);
};
