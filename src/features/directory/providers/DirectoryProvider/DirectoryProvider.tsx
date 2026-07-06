import { useCallback, useEffect, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { revealTargetFromUrl } from "@/features/tabs/utils";

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

  // A clickable toast asked to jump to `path` and select `paths` there — or the window was opened
  // to reveal a file (`sfb <file>` / window.rs, seeded from the URL). Applied once that folder's
  // listing has loaded (below), since navigation + load are async.
  const [revealTarget, setRevealTarget] = useState<{
    path: string;
    paths: string[];
  } | null>(revealTargetFromUrl);

  // The single entry to scroll into view once selected (the revealed file). Consumed by the view,
  // which ensures it's rendered and scrolls to it, then clears this.
  const [revealID, setRevealID] = useState<string | null>(null);
  const clearRevealID = useCallback(() => setRevealID(null), []);

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
      // Scroll the first revealed entry into view (the view mounts it if it's past the render
      // batch, then scrolls). One-shot: clear the request so a later refresh doesn't repeat this.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealID(present[0]);
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
        revealID,
        clearRevealID,
      }}
    >
      {children}
    </DirectoryContext.Provider>
  );
};
