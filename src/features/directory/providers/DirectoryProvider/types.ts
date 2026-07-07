import type { ReactNode } from "react";

import type { DirEntry } from "@/shared/models";

import type { useDirectoryEntries } from "../../hooks/useDirectoryEntries";
import type { useSelection } from "../../hooks/useSelection";
import type { useFileOperations } from "../../hooks/useFileOperations";
import type { usePreview } from "../../hooks/usePreview";
import type { useProperties } from "../../hooks/useProperties";

// Everything the directory view and the quick-actions bar share. Lifted here (out of the
// Directory component) so siblings like the QuickBar can act on the same selection/state.
export type DirectoryContextValue = ReturnType<typeof useDirectoryEntries> &
  ReturnType<typeof useSelection> & {
    renamingID: string;
    setRenamingID: (id: string) => void;
    fileOps: ReturnType<typeof useFileOperations>;
    preview: ReturnType<typeof usePreview>;
    properties: ReturnType<typeof useProperties>;
    // A revealed entry (sfb <file> / URL scheme / dock) to scroll into view once its folder has
    // loaded. The view ensures it's rendered, scrolls to it, then calls clearRevealID.
    revealID: string | null;
    clearRevealID: () => void;
    // Open a file like a double-click in the listing: in-app preview when its setting covers the
    // type, the OS default app otherwise. Shared by the view and the path bar.
    openFile: (entry: DirEntry) => Promise<void>;
  };

export type DirectoryProviderProps = {
  children: ReactNode;
};
