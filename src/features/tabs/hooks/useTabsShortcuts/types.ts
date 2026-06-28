export interface UseTabsShortcutsArgs {
  newTab: () => void;
  // Close the currently active tab.
  closeActiveTab: () => void;
  // Move the active tab by an offset (+1 next, -1 previous), wrapping around.
  cycleTab: (direction: number) => void;
}
