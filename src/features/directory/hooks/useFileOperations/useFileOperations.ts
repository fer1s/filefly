import { useCallback, useState } from "react";
import { ask, open as openDialog } from "@tauri-apps/plugin-dialog";
import { homeDir, join } from "@tauri-apps/api/path";

import { useStateContext } from "@/shared/providers/StateProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { basename, dirname } from "@/shared/utils";
import { TRASH_DIR_NAME } from "@/shared/constants";
import { t } from "@/lang";
import { CLIPBOARD_MODE } from "@/features/directory/constants";

import { withName, entryLabel, destPaths } from "./utils";
import type {
  Clipboard,
  OperationProgress,
  UseFileOperationsArgs,
} from "./types";

// Core filesystem operations on a list of paths, shared by the context menu and the
// keyboard shortcuts. Owns the internal copy/cut clipboard and the batch progress.
export const useFileOperations = ({
  path,
  refreshDir,
  setSelectedIDs,
  revealEntries,
}: UseFileOperationsArgs) => {
  const { fs, clickableToasts } = useStateContext();
  const [clipboard, setClipboard] = useState<Clipboard>(null);

  // The onAction for a clickable "jump to the file" toast — or undefined when the setting is off,
  // which leaves the toast a plain (dismiss-only) notification.
  const revealAction = useCallback(
    (destDir: string, paths: string[]) =>
      clickableToasts ? () => revealEntries(destDir, paths) : undefined,
    [clickableToasts, revealEntries],
  );
  // The current batch operation (copy/move/delete) so the status bar can show a progress bar.
  const [progress, setProgress] = useState<OperationProgress | null>(null);

  // All wrapped in useCallback so they're stable props for memoized entry rows.
  const copy = useCallback((targets: string[]) => {
    if (!targets.length || !targets[0]) return;
    setClipboard({ paths: targets, mode: CLIPBOARD_MODE.COPY });
    notify(t.directory.copied(entryLabel(targets)), TOAST_TYPE.SUCCESS);
  }, []);

  const cut = useCallback((targets: string[]) => {
    if (!targets.length || !targets[0]) return;
    setClipboard({ paths: targets, mode: CLIPBOARD_MODE.CUT });
    notify(t.directory.cut(entryLabel(targets)), TOAST_TYPE.SUCCESS);
  }, []);

  // Trash (reversible) or permanent delete, sharing the confirm + progress + error handling.
  const deleteTargets = useCallback(
    async (targets: string[], permanent: boolean) => {
      if (!targets.length || !targets[0]) return;

      const label = entryLabel(targets);
      const confirmed = await ask(
        permanent
          ? t.directory.confirmDeletePermanently(label)
          : t.directory.confirmDelete(label),
        { title: t.directory.deleteTitle, kind: "warning" },
      );
      if (!confirmed) return;

      const progressLabel = permanent
        ? t.directory.deletingPermanently
        : t.directory.deleting;
      setProgress({ label: progressLabel, done: 0, total: targets.length });
      let failed = 0;
      try {
        for (const target of targets) {
          try {
            await (permanent ? fs.deletePermanently(target) : fs.trash(target));
          } catch (err) {
            failed++;
            notify(
              t.errors.delete(basename(target), String(err)),
              TOAST_TYPE.ERROR,
            );
          }
          setProgress((prev) => prev && { ...prev, done: prev.done + 1 });
        }
      } finally {
        setProgress(null);
      }

      if (!failed)
        // Trashing offers a click to open the Trash; a permanent delete has nowhere to go.
        notify(
          permanent ? t.directory.deleted(label) : t.directory.trashed(label),
          TOAST_TYPE.SUCCESS,
          permanent || !clickableToasts
            ? undefined
            : async () =>
                revealEntries(await join(await homeDir(), TRASH_DIR_NAME), []),
        );

      setSelectedIDs([]);
      refreshDir();
    },
    [fs, refreshDir, setSelectedIDs, revealEntries, clickableToasts],
  );

  const remove = useCallback(
    (targets: string[]) => deleteTargets(targets, false),
    [deleteTargets],
  );

  const removePermanently = useCallback(
    (targets: string[]) => deleteTargets(targets, true),
    [deleteTargets],
  );

  // Restore trashed items: each to its recorded original location, or — for items we have no
  // record of — to one folder the user picks. Mirrors Finder's "Put Back" as closely as the OS
  // lets us (macOS doesn't expose its own put-back data).
  const restore = useCallback(
    async (targets: string[]) => {
      if (!targets.length || !targets[0]) return;

      const unresolved: string[] = [];
      // Where each item landed, so the toast can jump there and select them.
      const restoredPaths: string[] = [];
      for (const target of targets) {
        try {
          const dest = await fs.restoreTrashed(target);
          if (dest) restoredPaths.push(dest);
          else unresolved.push(target);
        } catch (err) {
          notify(
            t.errors.restore(basename(target), String(err)),
            TOAST_TYPE.ERROR,
          );
        }
      }

      if (unresolved.length) {
        const dir = await openDialog({
          directory: true,
          title: t.directory.restoreToTitle,
        });
        if (typeof dir === "string") {
          for (const target of unresolved) {
            try {
              await fs.move(target, dir);
              restoredPaths.push(...destPaths([target], dir));
            } catch (err) {
              notify(
                t.errors.restore(basename(target), String(err)),
                TOAST_TYPE.ERROR,
              );
            }
          }
        }
      }

      if (restoredPaths.length) {
        // Jump to where the first item landed and select those restored into that folder.
        const destDir = dirname(restoredPaths[0]);
        notify(
          t.directory.restored(entryLabel(targets)),
          TOAST_TYPE.SUCCESS,
          revealAction(destDir, restoredPaths),
        );
      }
      setSelectedIDs([]);
      refreshDir();
    },
    [fs, refreshDir, setSelectedIDs, revealAction],
  );

  const paste = useCallback(async () => {
    if (!clipboard || path === "") return;

    const isCopy = clipboard.mode === CLIPBOARD_MODE.COPY;
    const label = entryLabel(clipboard.paths);
    const progressLabel = isCopy ? t.directory.copying : t.directory.moving;
    // Byte progress streamed from Rust for the item being copied/moved (one item at a time).
    const onProgress = (p: { processed: number; total: number }) =>
      setProgress({ label: progressLabel, done: p.processed, total: p.total });

    setProgress({ label: progressLabel, done: 0, total: 0 });
    let failed = 0;
    try {
      for (const source of clipboard.paths) {
        try {
          if (isCopy) await fs.copy(source, path, onProgress);
          else await fs.move(source, path, onProgress);
        } catch (err) {
          failed++;
          notify(
            t.errors.paste(basename(source), String(err)),
            TOAST_TYPE.ERROR,
          );
        }
      }
    } finally {
      setProgress(null);
    }

    if (!failed) {
      // Files land in the current folder; the toast jumps here and selects them.
      const landed = destPaths(clipboard.paths, path);
      notify(
        isCopy ? t.directory.pasted(label) : t.directory.moved(label),
        TOAST_TYPE.SUCCESS,
        revealAction(path, landed),
      );
    }

    if (clipboard.mode === CLIPBOARD_MODE.CUT) setClipboard(null);
    setSelectedIDs([]);
    refreshDir();
  }, [clipboard, path, fs, refreshDir, setSelectedIDs, revealAction]);

  // Transfer (move or copy) a set of entries into a destination folder (drag-and-drop). Unlike
  // paste it takes an explicit destination rather than the current folder, and skips no-op /
  // invalid transfers (an entry already in dest, or a folder dropped onto itself or a descendant).
  const transferTo = useCallback(
    async (sources: string[], destDir: string, isCopy: boolean) => {
      const valid = sources.filter((src) => {
        if (!src) return false;
        if (dirname(src) === destDir) return false; // already there
        if (destDir === src || destDir.startsWith(`${src}/`)) return false; // into self/descendant
        return true;
      });
      if (!valid.length) return;

      const label = entryLabel(valid);
      const progressLabel = isCopy ? t.directory.copying : t.directory.moving;
      const onProgress = (p: { processed: number; total: number }) =>
        setProgress({
          label: progressLabel,
          done: p.processed,
          total: p.total,
        });

      setProgress({ label: progressLabel, done: 0, total: 0 });
      let failed = 0;
      try {
        for (const source of valid) {
          try {
            if (isCopy) await fs.copy(source, destDir, onProgress);
            else await fs.move(source, destDir, onProgress);
          } catch (err) {
            failed++;
            notify(
              t.errors.paste(basename(source), String(err)),
              TOAST_TYPE.ERROR,
            );
          }
        }
      } finally {
        setProgress(null);
      }

      if (!failed) {
        // The toast jumps to the destination folder and selects what landed there.
        const landed = destPaths(valid, destDir);
        notify(
          isCopy ? t.directory.pasted(label) : t.directory.moved(label),
          TOAST_TYPE.SUCCESS,
          revealAction(destDir, landed),
        );
      }
      setSelectedIDs([]);
      refreshDir();
    },
    [fs, refreshDir, setSelectedIDs, revealAction],
  );

  const moveTo = useCallback(
    (sources: string[], destDir: string) => transferTo(sources, destDir, false),
    [transferTo],
  );

  const copyTo = useCallback(
    (sources: string[], destDir: string) => transferTo(sources, destDir, true),
    [transferTo],
  );

  const rename = useCallback(
    async (targetPath: string, newName: string) => {
      try {
        await fs.rename(targetPath, newName);
        notify(t.directory.renamed(newName), TOAST_TYPE.SUCCESS);
        // Keep the renamed entry selected: its path changed (same folder, new name), so
        // re-select it by the new path once the listing refreshes below.
        setSelectedIDs([withName(targetPath, newName)]);
      } catch (err) {
        notify(t.errors.rename(String(err)), TOAST_TYPE.ERROR);
      }
      refreshDir();
    },
    [fs, refreshDir, setSelectedIDs],
  );

  return {
    clipboard,
    copy,
    cut,
    remove,
    removePermanently,
    restore,
    paste,
    moveTo,
    copyTo,
    rename,
    progress,
  };
};
