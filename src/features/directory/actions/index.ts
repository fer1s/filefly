// Public API of the generic context-menu actions. Each action is a self-contained,
// predefined descriptor (presentation + behavior); the menu composes them per context using
// the layout from context_menu.toml.
export { ENTRY_ACTION, ACTION_SEPARATOR } from "./constants";
export type { EntryActionId } from "./constants";
export type { EntryAction, EntryActionContext, FileActions } from "./types";

export { ENTRY_ACTIONS } from "./registry";
export { resolveActionIds, isActionVisible } from "./utils";

export { newFolderAction } from "./newFolder";
export { openAction } from "./open";
export { openInTerminalAction } from "./openInTerminal";
export { previewAction } from "./preview";
export { copyAction } from "./copy";
export { cutAction } from "./cut";
export { pasteAction } from "./paste";
export { renameAction } from "./rename";
export { trashAction } from "./trash";
export { restoreAction } from "./restore";
export { destroyAction } from "./destroy";
export { propertiesAction } from "./properties";
