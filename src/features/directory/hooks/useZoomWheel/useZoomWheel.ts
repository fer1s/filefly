import { useEffect } from "react";

import { useSettings } from "@/features/settings";
import { useStateContext } from "@/shared/providers/StateProvider";

import type { UseZoomWheelOptions, ZoomWheelTargetRef } from "./types";

// Command/Ctrl + wheel changes the directory's persisted zoom while leaving ordinary scrolling
// untouched. The listener is non-passive so the webview cannot apply its own page zoom.
export const useZoomWheel = (
  targetRef: ZoomWheelTargetRef,
  { enabled }: UseZoomWheelOptions,
) => {
  const { settings } = useSettings();
  const { zoomIn, zoomOut } = useStateContext();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const handleWheel = (event: WheelEvent) => {
      if (!enabled || (!event.metaKey && !event.ctrlKey)) return;

      event.preventDefault();
      if (!settings.zoomWithModifierWheel || event.deltaY === 0) return;

      if (event.deltaY < 0) zoomIn();
      else zoomOut();
    };

    target.addEventListener("wheel", handleWheel, { passive: false });
    return () => target.removeEventListener("wheel", handleWheel);
  }, [enabled, settings.zoomWithModifierWheel, targetRef, zoomIn, zoomOut]);
};
