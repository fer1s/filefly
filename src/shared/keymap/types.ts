import type { ReactNode } from "react";

import type { KeymapAction } from "./constants";

export type KeyBinding = {
  keys: string[];
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type Keymap = Partial<Record<KeymapAction, KeyBinding>>;

export type KeymapContextValue = {
  keymap: Keymap;
  setBinding: (action: KeymapAction, binding: KeyBinding) => void;
};

export type KeymapProviderProps = {
  children: ReactNode;
};
