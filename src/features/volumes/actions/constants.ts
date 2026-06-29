// Stable identifiers for the volumes view context-menu actions. Used as keys, never shown to the
// user (labels come from i18n).
export const VOLUME_ACTION = {
  OPEN: "open",
  OPEN_IN_NEW_TAB: "open_in_new_tab",
  OPEN_IN_TERMINAL: "open_in_terminal",
  EJECT: "eject",
  PROPERTIES: "properties",
} as const;

export type VolumeActionId = (typeof VOLUME_ACTION)[keyof typeof VOLUME_ACTION];

// Token in an action list that renders a divider between groups (not a real action).
export const ACTION_SEPARATOR = "separator";

// The volumes context menu, in order. Declarative source — add/move an id here rather than
// branching in the component.
export const VOLUME_MENU: readonly string[] = [
  VOLUME_ACTION.OPEN,
  VOLUME_ACTION.OPEN_IN_NEW_TAB,
  VOLUME_ACTION.OPEN_IN_TERMINAL,
  ACTION_SEPARATOR,
  VOLUME_ACTION.EJECT,
  VOLUME_ACTION.PROPERTIES,
];
