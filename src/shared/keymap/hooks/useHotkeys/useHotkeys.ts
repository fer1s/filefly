import { useEffect, useLayoutEffect, useRef } from "react";

import type { KeymapAction } from "../../constants";
import { HOTKEY_SCOPE } from "../../scopes";
import type { HotkeyHandler, KeyBinding } from "../../types";
import { useHotkeyContext } from "../../providers/HotkeyContext";

export type HotkeySpec = {
  binding: KeymapAction | KeyBinding;
  handler: HotkeyHandler;
  scope?: (typeof HOTKEY_SCOPE)[keyof typeof HOTKEY_SCOPE];
  priority?: number;
  allowInInput?: boolean;
};

// Register a variable-length list of hotkeys from a single hook call — for cases where the set is
// data-driven (pinned-folder slots, numbered tab slots) and so can't be a fixed number of
// useHotkey calls. Handlers are read live from a ref, so the registry only churns when the
// bindings/scopes change (not on every render).
export const useHotkeys = (
  specs: HotkeySpec[],
  options: { when?: boolean } = {},
) => {
  const { register } = useHotkeyContext();
  const { when = true } = options;

  const specsRef = useRef(specs);
  useLayoutEffect(() => {
    specsRef.current = specs;
  });

  // Re-register only when the bindings/scopes/length change — not when handler identities do.
  const key = JSON.stringify(
    specs.map((s) => [s.binding, s.scope, s.priority, s.allowInInput]),
  );

  useEffect(() => {
    if (!when) return;
    const unregister = specs.map((spec, i) => {
      const isAction = typeof spec.binding === "string";
      return register({
        action: isAction ? (spec.binding as KeymapAction) : undefined,
        hotkey: isAction ? undefined : (spec.binding as KeyBinding),
        scope: spec.scope ?? HOTKEY_SCOPE.GLOBAL,
        priority: spec.priority ?? 0,
        allowInInput: spec.allowInInput ?? false,
        handler: (e) => specsRef.current[i]?.handler(e),
      });
    });
    return () => unregister.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, when, key]);
};
