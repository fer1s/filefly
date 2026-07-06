import { faTrash } from "@fortawesome/free-solid-svg-icons";

import { UI_COLOR } from "@/shared/constants";
import { t } from "@/lang";

import { SIDEBAR_ACTION } from "./constants";
import type { SidebarAction } from "./types";

// Delete the clicked connection (with confirmation, handled by the SideBar handler). Only removes
// it from the app — nothing on the server is touched.
export const removeConnectionAction: SidebarAction = {
  id: SIDEBAR_ACTION.REMOVE_CONNECTION,
  label: () => t.connections.remove,
  icon: faTrash,
  color: UI_COLOR.DANGER,
  run: ({ path, removeConnection, onClose }) => {
    removeConnection(path);
    onClose();
  },
};
