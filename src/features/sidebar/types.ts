import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import type { SidebarItemKind } from "./constants";

export type SidebarPathItem = {
  name: string;
  path: string;
  icon: IconDefinition;
  // What the row represents — drives its context-menu actions.
  kind: SidebarItemKind;
  // Set only on built-in preset rows (see PRESET_ID). Marks the row as hideable (not deletable)
  // and is the stable key used to persist its hidden state across machines (paths differ).
  presetId?: string;
};

export type SideBarProps = {
  collapsed: boolean;
  onToggle: () => void;
};
