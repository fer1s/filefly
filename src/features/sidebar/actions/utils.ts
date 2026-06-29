import type { SidebarItemKind } from "../constants";
import { SIDEBAR_MENU_LAYOUT } from "./constants";

// The ordered action-id list (including separators) for a sidebar item kind.
export const resolveSidebarActions = (
  kind: SidebarItemKind,
): readonly string[] => SIDEBAR_MENU_LAYOUT[kind] ?? [];
