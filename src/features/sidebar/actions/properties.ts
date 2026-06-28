import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { SIDEBAR_ACTION } from "./constants";
import type { SidebarAction } from "./types";

// Open the properties dialog for the row's path.
export const propertiesAction: SidebarAction = {
  id: SIDEBAR_ACTION.PROPERTIES,
  label: () => t.contextMenu.properties,
  icon: faCircleInfo,
  run: async ({ path, openProperties, onClose }) => {
    onClose();
    await openProperties(path);
  },
};
