import { SIDEBAR_ITEM_KIND, type SidebarItemKind } from "../constants";

// Stable identifiers for the sidebar context-menu actions. Used as keys, never shown to the
// user (labels come from i18n).
export const SIDEBAR_ACTION = {
  OPEN_IN_NEW_TAB: "open_in_new_tab",
  OPEN_IN_TERMINAL: "open_in_terminal",
  EMPTY_TRASH: "empty_trash",
  PROPERTIES: "properties",
} as const;

export type SidebarActionId =
  (typeof SIDEBAR_ACTION)[keyof typeof SIDEBAR_ACTION];

// Token in an action list that renders a divider between groups (not a real action).
export const ACTION_SEPARATOR = "separator";

// Which actions each sidebar item kind exposes, in order. This is the single declarative
// source for the menu — add/move an id here rather than branching in the component.
export const SIDEBAR_MENU_LAYOUT: Record<SidebarItemKind, readonly string[]> = {
  [SIDEBAR_ITEM_KIND.FOLDER]: [
    SIDEBAR_ACTION.OPEN_IN_NEW_TAB,
    SIDEBAR_ACTION.OPEN_IN_TERMINAL,
    ACTION_SEPARATOR,
    SIDEBAR_ACTION.PROPERTIES,
  ],
  [SIDEBAR_ITEM_KIND.VOLUME]: [
    SIDEBAR_ACTION.OPEN_IN_NEW_TAB,
    SIDEBAR_ACTION.OPEN_IN_TERMINAL,
    ACTION_SEPARATOR,
    SIDEBAR_ACTION.PROPERTIES,
  ],
  // Recents is a virtual listing, not a real folder — only opening it in a tab makes sense.
  [SIDEBAR_ITEM_KIND.RECENTS]: [SIDEBAR_ACTION.OPEN_IN_NEW_TAB],
  [SIDEBAR_ITEM_KIND.TRASH]: [
    SIDEBAR_ACTION.OPEN_IN_NEW_TAB,
    SIDEBAR_ACTION.OPEN_IN_TERMINAL,
    ACTION_SEPARATOR,
    SIDEBAR_ACTION.EMPTY_TRASH,
  ],
};
