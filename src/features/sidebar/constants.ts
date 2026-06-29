// The kinds of item a sidebar row can represent. Drives which context-menu actions apply
// (see features/sidebar/actions). Folders/volumes are real paths; recents is the virtual
// Recents sentinel; trash is the special ~/.Trash pin.
export const SIDEBAR_ITEM_KIND = {
  FOLDER: "folder",
  TRASH: "trash",
  RECENTS: "recents",
  VOLUME: "volume",
} as const;

export type SidebarItemKind =
  (typeof SIDEBAR_ITEM_KIND)[keyof typeof SIDEBAR_ITEM_KIND];
