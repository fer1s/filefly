// Class toggled on an entry the pointer is hovering over as a valid drop target.
export const DRAG_OVER_CLASS = "drag_over";
// Class toggled on <body> while an entry drag is in flight (drives the ghost + cursor).
export const DRAGGING_BODY_CLASS = "is-entry-dragging";
// Pixel offset of the drag ghost from the pointer, so it doesn't sit right under the cursor.
export const GHOST_OFFSET = 14;
// Max name pills shown in the multi-drag ghost stack; the red count badge conveys the true total.
export const DRAG_GHOST_MAX_PILLS = 5;
// How close to the window edge (px) the pointer must get to hand the drag off to the OS. The
// webview only reports pointer moves within its bounds, so the final frame sits at the edge.
export const WINDOW_EDGE_PX = 2;
