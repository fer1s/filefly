import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type SidebarPathItem = {
  name: string;
  path: string;
  icon: IconDefinition;
};

export type SideBarProps = {
  collapsed: boolean;
  onToggle: () => void;
  visitedPaths: readonly string[];
};
