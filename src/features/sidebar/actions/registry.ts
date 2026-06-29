import { SIDEBAR_ACTION, type SidebarActionId } from "./constants";
import type { SidebarAction } from "./types";

import { openInNewTabAction } from "./openInNewTab";
import { openInTerminalAction } from "./openInTerminal";
import { emptyTrashAction } from "./emptyTrash";
import { ejectAction } from "./eject";
import { propertiesAction } from "./properties";

// Lookup from a sidebar action id to its predefined descriptor.
export const SIDEBAR_ACTIONS: Record<SidebarActionId, SidebarAction> = {
  [SIDEBAR_ACTION.OPEN_IN_NEW_TAB]: openInNewTabAction,
  [SIDEBAR_ACTION.OPEN_IN_TERMINAL]: openInTerminalAction,
  [SIDEBAR_ACTION.EMPTY_TRASH]: emptyTrashAction,
  [SIDEBAR_ACTION.EJECT]: ejectAction,
  [SIDEBAR_ACTION.PROPERTIES]: propertiesAction,
};
