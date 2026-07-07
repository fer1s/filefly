import { useCallback, useEffect, useMemo, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { openPreviewWindow, openPropertiesWindow } from "@/shared/services/api";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { extension } from "@/shared/utils";
import type { DirEntry } from "@/shared/models";
import { t } from "@/lang";
import { revealTargetFromUrl } from "@/features/tabs/utils";
import { opensInAppPreview } from "@/features/directory/constants";

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
  const {
    fs,
    view,
    path,
    setPath,
    refreshDir,
    openPreviewInWindow,
    openPropertiesInWindow,
    previewImagesInApp,
    previewMarkdownInApp,
  } = useStateContext();

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

  // The preview opens either in the in-app overlay or, when openPreviewInWindow is on, its own
  // detached window (a fresh window per open). Branch here — in the one place `preview.open` is
  // created — so every trigger (Open/Preview in the context menu, the quick bar, keyboard) honours
  // the setting without each caller re-checking it.
  const openPreview = useCallback(
    (path: string) => {
      if (openPreviewInWindow) {
        void openPreviewWindow(path).catch((err) =>
          notify(t.errors.open(String(err)), TOAST_TYPE.ERROR),
        );
        return;
      }
      preview.open(path);
    },
    [openPreviewInWindow, preview],
  );
  const previewApi = useMemo(
    () => ({ ...preview, open: openPreview }),
    [preview, openPreview],
  );

  // Open a file like a double-click in the listing: images/markdown go to the in-app preview when
  // their setting is on, everything else (and those when it's off) opens in the OS default app.
  // Shared by the directory view (Enter/double-click) and the path bar (committing a file path).
  const openFile = useCallback(
    async (entry: DirEntry) => {
      const ext = extension(entry.name);
      // In-app preview keeps the real (possibly remote) path so prev/next works over the folder's
      // entries; the Preview panel downloads a remote file to the cache itself. Opening in the OS
      // app needs a local path now, so materialize first (read-only — see SSH_PLAN.md phase 3a).
      if (opensInAppPreview(ext, previewImagesInApp, previewMarkdownInApp)) {
        openPreview(entry.path);
        return;
      }
      try {
        // TODO(SSH_PLAN.md §9): opening a remote file in an external OS app edits only the local
        // cache copy — changes are NOT pushed back to the server. Would need to watch the temp and
        // re-upload on change. The in-app markdown editor does save back (see useMarkdownPreview).
        await fs.open(await fs.materialize(entry.path));
      } catch (err) {
        notify(t.connections.openError(String(err)), TOAST_TYPE.ERROR);
      }
    },
    [previewImagesInApp, previewMarkdownInApp, openPreview, fs],
  );

  // Same branch for properties: in-app dialog, or a detached window when openPropertiesInWindow is
  // on. Centralised here so the context menu, quick bar and keyboard shortcut all honour the setting.
  const openProperties = useCallback(
    async (targetId: string, isCurrentDirectory: boolean) => {
      if (openPropertiesInWindow) {
        try {
          await openPropertiesWindow(targetId);
        } catch (err) {
          notify(t.errors.properties(String(err)), TOAST_TYPE.ERROR);
        }
        return;
      }
      await properties.open(targetId, isCurrentDirectory);
    },
    [openPropertiesInWindow, properties],
  );
  const propertiesApi = useMemo(
    () => ({ ...properties, open: openProperties }),
    [properties, openProperties],
  );

  return (
    <DirectoryContext.Provider
      value={{
        ...entries,
        ...selection,
        renamingID,
        setRenamingID,
        fileOps,
        preview: previewApi,
        properties: propertiesApi,
        revealID,
        clearRevealID,
        openFile,
      }}
    >
      {children}
    </DirectoryContext.Provider>
  );
};
