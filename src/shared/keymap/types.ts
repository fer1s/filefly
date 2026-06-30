import type { ReactNode } from "react";

import type { KeymapAction } from "./constants";
import type { HotkeyScope } from "./scopes";

export type KeyBinding = {
  keys: string[];
  // `mod` = Cmd (mac) / Ctrl (win-linux). `ctrl` = literally Control on every platform.
  mod?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type Keymap = Partial<Record<KeymapAction, KeyBinding>>;

// A hotkey handler. Returning `false` means "I didn't handle this" → the dispatcher falls through
// to the next-best candidate (opt-in passthrough). Any other return consumes the event.
export type HotkeyHandler = (event: KeyboardEvent) => void | boolean;

// One registered hotkey. Either `action` (resolved against the live, rebindable keymap) or
// `hotkey` (a fixed binding, e.g. Escape / arrows) is set.
export type HotkeyEntry = {
  id: number;
  action?: KeymapAction;
  hotkey?: KeyBinding;
  scope: HotkeyScope;
  priority: number;
  allowInInput: boolean;
  handler: HotkeyHandler;
};

export type HotkeyOptions = {
  scope?: HotkeyScope;
  priority?: number; // tiebreak within a scope (default 0)
  allowInInput?: boolean; // default false → ignored while typing in input/textarea/CE
  when?: boolean; // only register while true (default true)
};

export type HotkeyContextValue = {
  register: (entry: Omit<HotkeyEntry, "id">) => () => void;
  pushScope: (scope: HotkeyScope) => () => void;
};

export type KeymapContextValue = {
  keymap: Keymap;
  setBinding: (action: KeymapAction, binding: KeyBinding) => void;
};

export type KeymapProviderProps = {
  children: ReactNode;
};
