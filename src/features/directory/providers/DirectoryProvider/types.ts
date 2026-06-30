import type { ReactNode } from "react";

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
  };

export type DirectoryProviderProps = {
  children: ReactNode;
};
