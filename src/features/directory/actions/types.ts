import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import type { EntryKind, UiColor } from "@/shared/constants";
import type { FileSystemManager } from "@/shared/managers/FileSystemManager";
import type { KeymapAction } from "@/shared/keymap";

import type { EntryActionId } from "./constants";

// The filesystem operations an action may invoke (the subset of useFileOperations' API that
// the generic actions need). Kept narrow so actions don't depend on the whole hook.
export type FileActions = {
  copy: (targets: string[]) => void;
  cut: (targets: string[]) => void;
  paste: () => Promise<void>;
  remove: (targets: string[]) => Promise<void>;
  removePermanently: (targets: string[]) => Promise<void>;
  restore: (targets: string[]) => Promise<void>;
};

// Everything an action needs to run, resolved by the menu at click time. `targets` is the
// set of paths to act on (the whole selection or just the clicked entry); `elementId` is the
// single clicked entry, used by actions that act on one item (open, rename, properties).
export type EntryActionContext = {
  elementId: string;
  elementType: EntryKind;
  targets: string[];
  isCurrentDirectory: boolean;
  canPaste: boolean;
  fs: FileSystemManager;
  fileOps: FileActions;
  setPath: (path: string) => void;
  onClose: () => void;
  onStartRename: (id: string) => void;
  onPreview: (id: string) => void;
  onProperties: (
    id: string,
    isCurrentDirectory: boolean,
  ) => void | Promise<void>;
};

// A predefined, reusable context-menu action. Presentation (label/icon/hotkey/color) is
// declared statically; behavior lives in `run`. The menu decides which actions to show per
// context and renders each one the same way.
export type EntryAction = {
  id: EntryActionId;
  // Lazy so it always reads the current language dictionary.
  label: () => string;
  icon: IconDefinition;
  // Rebindable hotkey: resolved against the live keymap for its glyph.
  keymapAction?: KeymapAction;
  // Fixed (non-rebindable) hotkey glyph, e.g. Open = Enter.
  hotkey?: string;
  // Color variant (defaults to neutral); e.g. UI_COLOR.DANGER for destroy.
  color?: UiColor;
  // Whether the action makes sense for more than one target. When false (e.g. rename), it is
  // hidden once multiple entries are selected. Defaults to true.
  multiple?: boolean;
  // Whether the action is runnable in the given context (e.g. paste needs a clipboard).
  // Absent means always enabled.
  isEnabled?: (ctx: EntryActionContext) => boolean;
  run: (ctx: EntryActionContext) => void | Promise<void>;
};

// Inputs for resolving which actions apply to an entry (see resolveActionIds).
export type ResolveArgs = {
  isCurrentDirectory: boolean;
  // The entry is being browsed inside the Trash (uses the [trash] layout).
  inTrash: boolean;
  elementType: EntryKind;
  // Lowercased file extension (no dot); ignored for folders.
  extension: string;
};
