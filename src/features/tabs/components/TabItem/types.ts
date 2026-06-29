import type { Tab } from "@/shared/models";

export interface TabItemProps {
  tab: Tab;
  active: boolean;
  // Whether the close button should be available (hidden when only one tab is open).
  closable: boolean;
  // Hotkey glyph for the close-tab shortcut, shown in the close button's tooltip.
  closeHotkey?: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}
