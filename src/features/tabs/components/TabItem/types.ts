import type { useDrag } from "@use-gesture/react";

import type { Tab } from "@/shared/models";

// The pointer-handler props returned by a @use-gesture bind() call, spread onto a draggable node.
type BindProps = ReturnType<ReturnType<typeof useDrag>>;

export interface TabItemProps {
  tab: Tab;
  active: boolean;
  // Whether the close button should be available (hidden when only one tab is open).
  closable: boolean;
  // Hotkey glyph for the close-tab shortcut, shown in the close button's tooltip.
  closeHotkey?: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  // Drag-to-reorder wiring, supplied by TabBar. `bindProps` are the @use-gesture pointer handlers
  // spread onto the root. `translate` is this tab's live x-shift (px): the dragged tab follows the
  // pointer, the others slide to open a gap. `dragging` flags the lifted tab for its own styling.
  bindProps?: BindProps;
  dragging?: boolean;
  translate?: number;
}
