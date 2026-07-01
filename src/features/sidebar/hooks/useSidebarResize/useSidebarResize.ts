import { useCallback, type PointerEvent as ReactPointerEvent } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";

import { SIDEBAR_RESIZING_CLASS } from "./constants";
import { clampWidth } from "./utils";

// Drives the sidebar's draggable right edge. The sidebar's left edge sits at viewport x=0, so the
// pointer's clientX is the target width. Width persists via setSidebarWidth (debounced to disk).
export const useSidebarResize = () => {
  const { setSidebarWidth } = useStateContext();

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      event.preventDefault();
      document.body.classList.add(SIDEBAR_RESIZING_CLASS);

      const onMove = (moveEvent: PointerEvent) =>
        setSidebarWidth(clampWidth(moveEvent.clientX));

      const onUp = () => {
        document.body.classList.remove(SIDEBAR_RESIZING_CLASS);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [setSidebarWidth],
  );

  return { onPointerDown };
};
