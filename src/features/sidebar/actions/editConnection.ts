import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { SIDEBAR_ACTION } from "./constants";
import type { SidebarAction } from "./types";

// Edit the clicked connection — opens the connection form prefilled with its details.
export const editConnectionAction: SidebarAction = {
  id: SIDEBAR_ACTION.EDIT_CONNECTION,
  label: () => t.connections.edit,
  icon: faPenToSquare,
  run: ({ path, editConnection, onClose }) => {
    editConnection(path);
    onClose();
  },
};
