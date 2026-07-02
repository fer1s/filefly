import type { FavoriteKey } from "./constants";

export type FolderPickerDialogProps = {
  visible: boolean;
  // Folder the picker opens at. Empty string starts at the user's home folder.
  initialPath: string;
  // Called with the chosen absolute folder path.
  onChoose: (path: string) => void;
  onClose: () => void;
};

// A row in the main list: a subfolder, addressed by absolute path.
export type PickerEntry = {
  name: string;
  path: string;
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
