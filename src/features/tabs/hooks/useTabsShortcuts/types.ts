export interface UseTabsShortcutsArgs {
  newTab: () => void;
  // Close the currently active tab.
  closeActiveTab: () => void;
  // Move the active tab by an offset (+1 next, -1 previous), wrapping around.
  cycleTab: (direction: number) => void;
  // Select a tab by zero-based slot (Cmd+1..9). Slot 8 (Cmd+9) jumps to the last tab.
  selectTabBySlot: (slot: number) => void;
}
