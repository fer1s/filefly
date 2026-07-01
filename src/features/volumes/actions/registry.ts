import { VOLUME_ACTION, type VolumeActionId } from "./constants";
import type { VolumeAction } from "./types";

import { openAction } from "./open";
import { openInNewTabAction } from "./openInNewTab";
import { openInTerminalAction } from "./openInTerminal";
import { ejectAction } from "./eject";
import { propertiesAction } from "./properties";

// Lookup from a volume action id to its predefined descriptor.
export const VOLUME_ACTIONS: Record<VolumeActionId, VolumeAction> = {
  [VOLUME_ACTION.OPEN]: openAction,
  [VOLUME_ACTION.OPEN_IN_NEW_TAB]: openInNewTabAction,
  [VOLUME_ACTION.OPEN_IN_TERMINAL]: openInTerminalAction,
  [VOLUME_ACTION.EJECT]: ejectAction,
  [VOLUME_ACTION.PROPERTIES]: propertiesAction,
};
