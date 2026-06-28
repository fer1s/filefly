import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import type { UiColor } from "@/shared/constants";
import type { FileSystemManager } from "@/shared/managers/FileSystemManager";

import type { SidebarItemKind } from "../constants";
import type { SidebarActionId } from "./constants";

// Everything a sidebar action needs to run, resolved by the menu at click time. `path` and
// `kind` describe the clicked row; `currentPath` is the active tab's location (so Empty Trash
// can refresh the listing when it's currently showing the Trash).
export type SidebarActionContext = {
  path: string;
  kind: SidebarItemKind;
  currentPath: string;
  fs: FileSystemManager;
  openInNewTab: (path: string) => void;
  openProperties: (path: string) => void | Promise<void>;
  refreshDir: () => void;
  onClose: () => void;
};

// A predefined, reusable sidebar context-menu action. Presentation (label/icon/color) is
// declared statically; behavior lives in `run`.
export type SidebarAction = {
  id: SidebarActionId;
  // Lazy so it always reads the current language dictionary.
  label: () => string;
  icon: IconDefinition;
  // Color variant (defaults to neutral); e.g. UI_COLOR.DANGER for Empty Trash.
  color?: UiColor;
  run: (ctx: SidebarActionContext) => void | Promise<void>;
};
