// Debug-only capture of native drag activity, read by the headless probe (useControlProbe /
// `sfb ui-probe`) so a real drag can be inspected without a live debugger. Not used by product code.

export type DragOverSample = {
  rawX: number;
  rawY: number;
  dpr: number;
  cssX: number;
  cssY: number;
  resolved: string | null;
};

let lastOver: DragOverSample | null = null;
// Count of each onDragDropEvent payload.type seen since load, plus the last type — so we can tell
// whether the OS delivers native drag events to this webview at all during an in-window drag.
const eventCounts: Record<string, number> = {};
let lastEventType: string | null = null;

export const recordDragOver = (sample: DragOverSample): void => {
  lastOver = sample;
};

export const recordDragEvent = (type: string): void => {
  eventCounts[type] = (eventCounts[type] ?? 0) + 1;
  lastEventType = type;
};

export const getDragDiagnostics = () => ({
  lastOver,
  lastEventType,
  eventCounts: { ...eventCounts },
});
