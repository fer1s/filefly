import type { KeyboardEvent } from "react";

import { KEY } from "@/shared/constants";

// Keyboard parity with the mouse: Enter opens (like double-click), Space selects (like click).
export const handleVolumeKey =
  (open: () => void, select: () => void) =>
  (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === KEY.ENTER) {
      event.preventDefault();
      open();
    } else if (event.key === KEY.SPACE) {
      event.preventDefault();
      select();
    }
  };
