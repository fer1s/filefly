import { useEffect, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";

import { useDirectoryEntries } from "../../hooks/useDirectoryEntries";
import { useSelection } from "../../hooks/useSelection";
import { useFileOperations } from "../../hooks/useFileOperations";
import { usePreview } from "../../hooks/usePreview";
import { useProperties } from "../../hooks/useProperties";
import { useTags } from "../../hooks/useTags";

import { DirectoryContext } from "./DirectoryContext";
import type { DirectoryProviderProps } from "./types";

// Owns the directory's domain state (entries, selection, clipboard ops, preview/properties,
// inline rename) and provides it to the directory view and the quick-actions bar alike.
export const DirectoryProvider = ({ children }: DirectoryProviderProps) => {
  const { fs, view, path, refreshDir } = useStateContext();

  const entries = useDirectoryEntries(view);
  const tags = useTags(fs);
  const selection = useSelection(entries.sorted.map((entry) => entry.path));
  const [renamingID, setRenamingID] = useState("");

  // Navigating to a different folder starts with a clean selection — otherwise the entry we
  // opened (or any prior selection) lingers as a stale, now-offscreen selection.
  const { clearSelection } = selection;
  useEffect(() => {
    clearSelection();
  }, [path, clearSelection]);
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
        ...tags,
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
