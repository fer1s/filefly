import type { StartupMode } from "@/shared/constants";

// The launch preference cached in localStorage (see STARTUP_STORAGE_KEY). Read synchronously at
// mount to decide how the session opens.
export type StartupConfig = { mode: StartupMode; homePath: string };

// A tab's viewport geometry (edges/center/width), snapshotted at drag start (see TabBar).
export type TabGeom = {
  left: number;
  right: number;
  center: number;
  width: number;
};

// In-progress tab drag: which tab, its clamped render offset (`dx`) and raw pointer offset (`mx`),
// plus the layout snapshot taken at drag start.
export type TabDragState = {
  index: number;
  dx: number;
  mx: number;
  geom: TabGeom[] | null;
};
