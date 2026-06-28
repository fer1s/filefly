import type { ContextMenuLayout } from "@/shared/models";

// Fallback before the layout loads (or if loading fails): no actions.
export const EMPTY_LAYOUT: ContextMenuLayout = {
  directory: { actions: [] },
  folder: { actions: [] },
  file: { actions: [] },
  file_type: {},
};
