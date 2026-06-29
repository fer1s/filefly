import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";

import { TOAST_TYPE, type ToastType } from "@/shared/toast";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// Leading icon shown per toast type.
export const TOAST_ICON: Record<ToastType, IconDefinition> = {
  [TOAST_TYPE.SUCCESS]: faCircleCheck,
  [TOAST_TYPE.ERROR]: faCircleExclamation,
  [TOAST_TYPE.INFO]: faCircleInfo,
};
