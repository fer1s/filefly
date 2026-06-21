import type { RefObject } from "react";

// Visual rectangle of the rubber-band box, relative to the container content.
export type MarqueeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type UseMarqueeSelectionArgs = {
  containerRef: RefObject<HTMLDivElement | null>;
  setSelectedIDs: (ids: string[]) => void;
};
