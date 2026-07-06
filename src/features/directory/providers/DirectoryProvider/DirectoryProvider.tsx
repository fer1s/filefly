import { useCallback, useEffect, useState } from "react";

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
  const { view, path, setPath, refreshDir } = useStateContext();

  const entries = useDirectoryEntries(view);
  const selection = useSelection(entries.sorted.map((entry) => entry.path));
  const [renamingID, setRenamingID] = useState("");

  // A clickable toast asked to jump to `path` and select `paths` there. Applied once that
  // folder's listing has loaded (below), since navigation + load are async.
  const [revealTarget, setRevealTarget] = useState<{
    path: string;
    paths: string[];
  } | null>(null);

  // Navigating to a different folder starts with a clean selection — otherwise the entry we
  // opened (or any prior selection) lingers as a stale, now-offscreen selection.
  const { clearSelection, setSelectedIDs } = selection;
  useEffect(() => {
    clearSelection();
  }, [path, clearSelection]);

  // Called by the toasts: remember what to select, then navigate. Selection is applied by the
  // effect below once we're in the folder and its entries have loaded.
  const revealEntries = useCallback(
    (destDir: string, paths: string[]) => {
      if (paths.length) setRevealTarget({ path: destDir, paths });
      setPath(destDir);
    },
    [setPath],
  );

  // Once we're in the reveal target's folder and its entries include the target paths, select
  // them (this wins over the clear-on-navigate above, which runs earlier). Tolerates misses:
  // conflict-renamed items simply aren't selected, but navigation still happened.
  const { sorted } = entries;
  useEffect(() => {
    if (!revealTarget || revealTarget.path !== path) return;
    const present = revealTarget.paths.filter((p) =>
      sorted.some((entry) => entry.path === p),
    );
    if (present.length) {
      setSelectedIDs(present);
      // One-shot: clear the request so a later refresh doesn't re-select these entries.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealTarget(null);
    }
  }, [revealTarget, path, sorted, setSelectedIDs]);

  const fileOps = useFileOperations({
    path,
    refreshDir,
    setSelectedIDs: selection.setSelectedIDs,
    revealEntries,
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
