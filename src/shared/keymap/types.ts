import type { ReactNode } from "react";
import type {
  BindingOrList as CommandsBindingOrList,
  HotkeyEntry as CommandsHotkeyEntry,
  HotkeyHandler as CommandsHotkeyHandler,
  HotkeyOptions as CommandsHotkeyOptions,
  KeyBinding as CommandsKeyBinding,
  Keymap as CommandsKeymap,
} from "@sito/commands";

import type { KeymapAction } from "./constants";
import type { HotkeyScope } from "./scopes";

export type KeyBinding = CommandsKeyBinding;
export type BindingOrList = CommandsBindingOrList;

// An action maps to a single chord, or several alternative chords (the user can bind more than one
// shortcut to the same action — e.g. `[[nav_back]]` twice in keymap.toml).
export type Keymap = CommandsKeymap<KeymapAction>;

// A hotkey handler. Returning `false` means "I didn't handle this" → the dispatcher falls through
// to the next-best candidate (opt-in passthrough). Any other return consumes the event.
export type HotkeyHandler = CommandsHotkeyHandler;

// One registered hotkey. Either `command` (resolved against the live, rebindable keymap) or
// `hotkey` (a fixed binding, e.g. Escape / arrows) is set.
export type HotkeyEntry = CommandsHotkeyEntry<KeymapAction, HotkeyScope>;
export type HotkeyOptions = CommandsHotkeyOptions<HotkeyScope>;

export type KeymapContextValue = {
  keymap: Keymap;
  setBinding: (
    action: KeymapAction,
    binding: KeyBinding | KeyBinding[],
  ) => void;
};

export type KeymapProviderProps = {
  children: ReactNode;
};
