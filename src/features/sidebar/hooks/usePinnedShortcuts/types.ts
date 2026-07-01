import type { SidebarPathItem } from "../../types";

export type UsePinnedShortcutsArgs = {
  pinned: SidebarPathItem[];
  setPath: (path: string) => void;
};
