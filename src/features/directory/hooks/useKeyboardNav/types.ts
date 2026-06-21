import type { Dispatch, SetStateAction } from "react";

import { DirEntry } from "@/shared/models";
import { type ViewMode } from "@/shared/constants";

export type UseKeyboardNavArgs = {
  items: DirEntry[];
  view: ViewMode;
  enabled: boolean;
  setSelectedIDs: Dispatch<SetStateAction<string[]>>;
  onOpen: (entry: DirEntry) => void;
  onTypeaheadChange: (query: string) => void;
};
