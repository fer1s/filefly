// Vertical layout snapshot (viewport y) of one group, captured at drag start.
export type GroupGeom = {
  top: number;
  bottom: number;
  center: number;
  height: number;
};

// The in-flight drag: the layout snapshot taken at drag start plus the live pointer offset. `ids`
// and `geom` are the display-ordered visible groups; `index` is the dragged group's slot in them;
// `dy` is the clamped render offset and `my` the raw offset used to pick the target slot.
export type DragState = {
  ids: string[];
  geom: GroupGeom[];
  index: number;
  dy: number;
  my: number;
};
