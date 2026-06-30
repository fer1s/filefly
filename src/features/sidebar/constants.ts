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

// Stable ids for the sidebar groups. Used as the persistence key in sidebar.toml so a group's
// saved name/items survive even when its display label changes.
export const SIDEBAR_GROUP = {
  PINNED: "pinned",
  VOLUMES: "volumes",
  NETWORK: "network",
} as const;

export type SidebarGroupId = (typeof SIDEBAR_GROUP)[keyof typeof SIDEBAR_GROUP];

// Built-in top-to-bottom order of the sidebar groups, used until the user reorders them.
export const DEFAULT_GROUP_ORDER: readonly SidebarGroupId[] = [
  SIDEBAR_GROUP.PINNED,
  SIDEBAR_GROUP.VOLUMES,
  SIDEBAR_GROUP.NETWORK,
] as const;
