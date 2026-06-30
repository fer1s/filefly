import { useEffect } from "react";

import type { HotkeyScope } from "../../scopes";
import { useHotkeyContext } from "../../providers/HotkeyContext";

// Activate a scope while `active` holds (pushes it onto the active-scope stack, pops on cleanup).
// The feature that owns a context mounts this so its scoped hotkeys can win.
export const useHotkeyScope = (scope: HotkeyScope, active = true) => {
  const { pushScope } = useHotkeyContext();
  useEffect(() => {
    if (!active) return;
    return pushScope(scope);
  }, [pushScope, scope, active]);
};
