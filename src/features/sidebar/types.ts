import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// A pinned standard folder shown in the sidebar.
export type Pinned = { name: string; path: string; icon: IconDefinition };

export type SideBarProps = {
  collapsed: boolean;
  onToggle: () => void;
};
