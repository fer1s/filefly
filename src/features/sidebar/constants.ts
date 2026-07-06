import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";

import { RECENTS } from "@/shared/constants";
import { t } from "@/lang";

// The kinds of item a sidebar row can represent. Drives which context-menu actions apply
// (see features/sidebar/actions). Folders/volumes are real paths; recents is the virtual
// Recents sentinel; trash is the special ~/.Trash pin.
export const SIDEBAR_ITEM_KIND = {
  FOLDER: "folder",
  TRASH: "trash",
  RECENTS: "recents",
  VOLUME: "volume",
  TAG: "tag",
  // A saved SSH/SFTP connection (Network group). Its path is an `sftp://<id>/` URL that the
  // filesystem layer routes to the remote backend. See SSH_PLAN.md / features/connections.
  CONNECTION: "connection",
} as const;

export type SidebarItemKind =
  (typeof SIDEBAR_ITEM_KIND)[keyof typeof SIDEBAR_ITEM_KIND];

// Stable ids for the sidebar groups. Used as the persistence key in sidebar.toml so a group's
// saved name/items survive even when its display label changes.
export const SIDEBAR_GROUP = {
  PINNED: "pinned",
  VOLUMES: "volumes",
  NETWORK: "network",
  TAGS: "tags",
} as const;

export type SidebarGroupId = (typeof SIDEBAR_GROUP)[keyof typeof SIDEBAR_GROUP];

// Built-in top-to-bottom order of the sidebar groups, used until the user reorders them.
// Tags is macOS-only and system-managed (its rows come from the live Finder tags), so it's
// reorderable like Volumes but only shows when there are tags — see SideBar.
export const DEFAULT_GROUP_ORDER: readonly SidebarGroupId[] = [
  SIDEBAR_GROUP.PINNED,
  SIDEBAR_GROUP.VOLUMES,
  SIDEBAR_GROUP.NETWORK,
  SIDEBAR_GROUP.TAGS,
] as const;

// Finder-style "Recents" — a pinned entry that opens the virtual recent-files listing.
export const RECENTS_ITEM = {
  name: t.sidebar.recents,
  path: RECENTS,
  icon: faClockRotateLeft,
  kind: SIDEBAR_ITEM_KIND.RECENTS,
};

// Per-group metadata: the built-in default title and whether the group is user-editable
// (rename + add items). Volumes is system-managed, so it's reorderable but not editable.
export const GROUP_META: Record<
  SidebarGroupId,
  { title: string; editable: boolean }
> = {
  [SIDEBAR_GROUP.PINNED]: { title: t.sidebar.pinned, editable: true },
  [SIDEBAR_GROUP.VOLUMES]: { title: t.sidebar.volumes, editable: false },
  [SIDEBAR_GROUP.NETWORK]: { title: t.sidebar.network, editable: true },
  // System-managed like Volumes: reorderable, but the rows are the live Finder tags.
  [SIDEBAR_GROUP.TAGS]: { title: t.sidebar.tags, editable: false },
};
