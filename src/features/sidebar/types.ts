import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import type { SidebarItemKind } from "./constants";

export type SidebarPathItem = {
  name: string;
  path: string;
  icon: IconDefinition;
  // What the row represents — drives its context-menu actions.
  kind: SidebarItemKind;
};

export type SideBarProps = {
  collapsed: boolean;
  onToggle: () => void;
};
