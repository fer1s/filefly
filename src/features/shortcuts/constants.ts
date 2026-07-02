import {
  KEYMAP_ACTION,
  PINNED_ACTIONS,
  TAB_ACTIONS,
  type KeymapAction,
} from "@/shared/keymap";
import { t } from "@/lang";

export const SHORTCUTS_TITLE_ID = "shortcuts-dialog-title";

// A row in the cheat-sheet: a label plus the keymap action(s) it maps to. Multiple actions
// render as a range ("first … last") — used for the per-slot tab / pinned-folder hotkeys.
export type ShortcutRow = {
  label: () => string;
  actions: readonly KeymapAction[];
};
export type ShortcutSection = { title: () => string; rows: ShortcutRow[] };

// Declarative source for the shortcuts dialog. Add a row here to surface a binding; the displayed
// keys come from the live keymap via formatBinding, so this never hardcodes glyphs.
export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = [
  {
    title: () => t.shortcuts.sections.files,
    rows: [
      { label: () => t.shortcuts.actions.copy, actions: [KEYMAP_ACTION.COPY] },
      { label: () => t.shortcuts.actions.cut, actions: [KEYMAP_ACTION.CUT] },
      {
        label: () => t.shortcuts.actions.paste,
        actions: [KEYMAP_ACTION.PASTE],
      },
      { label: () => t.shortcuts.actions.undo, actions: [KEYMAP_ACTION.UNDO] },
      { label: () => t.shortcuts.actions.redo, actions: [KEYMAP_ACTION.REDO] },
      {
        label: () => t.shortcuts.actions.rename,
        actions: [KEYMAP_ACTION.RENAME],
      },
      {
        label: () => t.shortcuts.actions.newFolder,
        actions: [KEYMAP_ACTION.NEW_FOLDER],
      },
      {
        label: () => t.shortcuts.actions.trash,
        actions: [KEYMAP_ACTION.TRASH],
      },
      {
        label: () => t.shortcuts.actions.deletePermanently,
        actions: [KEYMAP_ACTION.DELETE_PERMANENTLY],
      },
      {
        label: () => t.shortcuts.actions.selectAll,
        actions: [KEYMAP_ACTION.SELECT_ALL],
      },
      {
        label: () => t.shortcuts.actions.openInTerminal,
        actions: [KEYMAP_ACTION.OPEN_IN_TERMINAL],
      },
      {
        label: () => t.shortcuts.actions.properties,
        actions: [KEYMAP_ACTION.PROPERTIES],
      },
    ],
  },
  {
    title: () => t.shortcuts.sections.navigation,
    rows: [
      {
        label: () => t.shortcuts.actions.navBack,
        actions: [KEYMAP_ACTION.NAV_BACK],
      },
      {
        label: () => t.shortcuts.actions.navForward,
        actions: [KEYMAP_ACTION.NAV_FORWARD],
      },
      {
        label: () => t.shortcuts.actions.navUp,
        actions: [KEYMAP_ACTION.NAV_UP],
      },
      {
        label: () => t.shortcuts.actions.goHome,
        actions: [KEYMAP_ACTION.GO_HOME],
      },
      { label: () => t.shortcuts.actions.pinned, actions: PINNED_ACTIONS },
    ],
  },
  {
    title: () => t.shortcuts.sections.view,
    rows: [
      {
        label: () => t.shortcuts.actions.toggleView,
        actions: [KEYMAP_ACTION.TOGGLE_VIEW],
      },
      {
        label: () => t.shortcuts.actions.toggleHidden,
        actions: [KEYMAP_ACTION.TOGGLE_HIDDEN],
      },
      {
        label: () => t.shortcuts.actions.toggleInfo,
        actions: [KEYMAP_ACTION.TOGGLE_INFO],
      },
      {
        label: () => t.shortcuts.actions.toggleSidebar,
        actions: [KEYMAP_ACTION.TOGGLE_SIDEBAR],
      },
      {
        label: () => t.shortcuts.actions.search,
        actions: [KEYMAP_ACTION.SEARCH],
      },
      {
        label: () => t.shortcuts.actions.zoomIn,
        actions: [KEYMAP_ACTION.ZOOM_IN],
      },
      {
        label: () => t.shortcuts.actions.zoomOut,
        actions: [KEYMAP_ACTION.ZOOM_OUT],
      },
    ],
  },
  {
    title: () => t.shortcuts.sections.preview,
    rows: [
      {
        label: () => t.shortcuts.actions.previewPrev,
        actions: [KEYMAP_ACTION.PREVIEW_PREV],
      },
      {
        label: () => t.shortcuts.actions.previewNext,
        actions: [KEYMAP_ACTION.PREVIEW_NEXT],
      },
      {
        label: () => t.shortcuts.actions.previewZoomIn,
        actions: [KEYMAP_ACTION.PREVIEW_ZOOM_IN],
      },
      {
        label: () => t.shortcuts.actions.previewZoomOut,
        actions: [KEYMAP_ACTION.PREVIEW_ZOOM_OUT],
      },
    ],
  },
  {
    title: () => t.shortcuts.sections.tabs,
    rows: [
      {
        label: () => t.shortcuts.actions.newTab,
        actions: [KEYMAP_ACTION.NEW_TAB],
      },
      {
        label: () => t.shortcuts.actions.newWindow,
        actions: [KEYMAP_ACTION.NEW_WINDOW],
      },
      {
        label: () => t.shortcuts.actions.closeTab,
        actions: [KEYMAP_ACTION.CLOSE_TAB],
      },
      {
        label: () => t.shortcuts.actions.nextTab,
        actions: [KEYMAP_ACTION.NEXT_TAB],
      },
      {
        label: () => t.shortcuts.actions.prevTab,
        actions: [KEYMAP_ACTION.PREV_TAB],
      },
      { label: () => t.shortcuts.actions.tab, actions: TAB_ACTIONS },
    ],
  },
  {
    title: () => t.shortcuts.sections.app,
    rows: [
      {
        label: () => t.shortcuts.actions.openSettings,
        actions: [KEYMAP_ACTION.OPEN_SETTINGS],
      },
      {
        label: () => t.shortcuts.actions.helpShortcuts,
        actions: [KEYMAP_ACTION.HELP_SHORTCUTS],
      },
    ],
  },
];
