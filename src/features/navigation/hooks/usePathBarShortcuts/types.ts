export type UsePathBarShortcutsArgs = {
  goBack: () => void;
  goForward: () => void;
  goUp: () => void;
  goHome: () => void;
  toggleView: () => void;
  toggleHidden: () => void;
  toggleInfo: () => void;
  toggleSearch: () => void;
  // Close the search field on Escape — only meaningful while it's open (not already closing).
  closeSearch: () => void;
  searchActive: boolean;
};
