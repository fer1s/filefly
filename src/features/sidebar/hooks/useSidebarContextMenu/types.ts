import type { SidebarItemKind } from "../../constants";

// The sidebar row a menu is open for. `isEjectable` only matters for volume rows (drives Eject).
export type SidebarMenuTarget = {
  path: string;
  kind: SidebarItemKind;
  isEjectable?: boolean;
};
