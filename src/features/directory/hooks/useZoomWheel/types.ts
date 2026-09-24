import type { RefObject } from "react";

export type UseZoomWheelOptions = {
  enabled: boolean;
};

export type ZoomWheelTargetRef = RefObject<HTMLElement | null>;
