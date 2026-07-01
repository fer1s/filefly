import { faTerminal } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { SIDEBAR_ACTION } from "./constants";
import type { SidebarAction } from "./types";

// Open a terminal at the row's folder. Only listed for real-path kinds (folders/volumes/trash).
export const openInTerminalAction: SidebarAction = {
  id: SIDEBAR_ACTION.OPEN_IN_TERMINAL,
  label: () => t.contextMenu.openInTerminal,
  icon: faTerminal,
  run: ({ fs, path, onClose }) => {
    fs.openInTerminal(path);
    onClose();
  },
};
