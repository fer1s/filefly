import { useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";

import { useDirectoryEntries } from "../../hooks/useDirectoryEntries";
import { useSelection } from "../../hooks/useSelection";
import { useFileOperations } from "../../hooks/useFileOperations";
import { usePreview } from "../../hooks/usePreview";
import { useProperties } from "../../hooks/useProperties";

import { DirectoryContext } from "./DirectoryContext";
import type { DirectoryProviderProps } from "./types";

// Owns the directory's domain state (entries, selection, clipboard ops, preview/properties,
// inline rename) and provides it to the directory view and the quick-actions bar alike.
export const DirectoryProvider = ({ children }: DirectoryProviderProps) => {
  const { view, path, refreshDir } = useStateContext();

  const entries = useDirectoryEntries(view);
  const selection = useSelection(entries.sorted.map((entry) => entry.path));
  const [renamingID, setRenamingID] = useState("");
  const fileOps = useFileOperations({
    path,
    refreshDir,
    setSelectedIDs: selection.setSelectedIDs,
  });
  const preview = usePreview(entries.previewables);
  const properties = useProperties();

  return (
    <DirectoryContext.Provider
      value={{
        ...entries,
        ...selection,
        renamingID,
        setRenamingID,
        fileOps,
        preview,
        properties,
      }}
    >
      {children}
    </DirectoryContext.Provider>
  );
};
