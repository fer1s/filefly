import type { Dispatch, SetStateAction } from "react";

import { DirEntry } from "@/shared/models";
import { type ViewMode } from "@/shared/constants";

export type UseKeyboardNavArgs = {
  items: DirEntry[];
  view: ViewMode;
  enabled: boolean;
  // Current selection, so Escape only consumes the event (and deselects) when there's something
  // to clear — otherwise it falls through (e.g. to exit fullscreen).
  selectedIDs: string[];
  setSelectedIDs: Dispatch<SetStateAction<string[]>>;
  onOpen: (entry: DirEntry) => void;
  onTypeaheadChange: (query: string) => void;
};
