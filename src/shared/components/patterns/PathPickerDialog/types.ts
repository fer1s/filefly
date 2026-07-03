import type { FavoriteKey } from "./constants";

// What the picker lets the user choose: a folder (folders navigable, the folder itself is the
// target) or a file (folders navigable but not selectable, files are the target).
export const PICK_KIND = {
  FOLDER: "folder",
  FILE: "file",
} as const;

export type PickKind = (typeof PICK_KIND)[keyof typeof PICK_KIND];

// Everything that varies between the folder picker and the file picker. Providers build this once
// and hand it to the shared dialog, so the dialog itself stays presentation-only.
export type PickerConfig = {
  kind: PickKind;
  // Header title, the confirm button label, and the empty-state text (all i18n strings).
  title: string;
  chooseLabel: string;
  emptyLabel: string;
  // File mode only: when set, files whose lowercased extension isn't listed are hidden. Omit to
  // show every file. Ignored in folder mode.
  extensions?: readonly string[];
};

export type PathPickerDialogProps = {
  visible: boolean;
  config: PickerConfig;
  // Location the picker opens at. Empty string starts at the user's home folder.
  initialPath: string;
  // Called with the chosen absolute path (a folder in folder mode, a file in file mode).
  onChoose: (path: string) => void;
  onClose: () => void;
};

// A row in the main list: a folder or file, addressed by absolute path. `isDir` drives its icon
// and whether double-click navigates into it (folders) or it's a selectable leaf (files).
export type PickerEntry = {
  name: string;
  path: string;
  isDir: boolean;
};

// A "Favorites" shortcut in the source list (resolved standard directory).
export type Favorite = {
  key: FavoriteKey;
  path: string;
};

// A "Locations" entry in the source list (a mounted volume).
export type Location = {
  name: string;
  path: string;
};
