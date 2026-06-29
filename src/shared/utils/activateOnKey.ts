import type { KeyboardEvent } from "react";

import { KEY } from "@/shared/constants";

// onKeyDown handler that runs `handler` on Enter or Space — turns a non-native clickable
// (e.g. a role="button" div) into a proper keyboard-operable control.
export const activateOnKey =
  (handler: () => void) => (event: KeyboardEvent) => {
    if (event.key === KEY.ENTER || event.key === KEY.SPACE) {
      event.preventDefault();
      handler();
    }
  };
