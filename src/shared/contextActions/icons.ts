import {
  faBolt,
  faCode,
  faFile,
  faFolder,
  faGear,
  faPlay,
  faRocket,
  faTerminal,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import { CUSTOM_ACTION_ICON, type CustomActionIcon } from "@/shared/constants";

export const CUSTOM_ACTION_ICONS: Record<CustomActionIcon, IconDefinition> = {
  [CUSTOM_ACTION_ICON.BOLT]: faBolt,
  [CUSTOM_ACTION_ICON.CODE]: faCode,
  [CUSTOM_ACTION_ICON.TERMINAL]: faTerminal,
  [CUSTOM_ACTION_ICON.APP]: faRocket,
  [CUSTOM_ACTION_ICON.PLAY]: faPlay,
  [CUSTOM_ACTION_ICON.GEAR]: faGear,
  [CUSTOM_ACTION_ICON.FILE]: faFile,
  [CUSTOM_ACTION_ICON.FOLDER]: faFolder,
};

export const customActionIcon = (key: string): IconDefinition =>
  CUSTOM_ACTION_ICONS[key as CustomActionIcon] ??
  CUSTOM_ACTION_ICONS[CUSTOM_ACTION_ICON.BOLT];
