import { useCallback, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";

import { useStateContext } from "@/shared/providers/StateProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { basename } from "@/shared/utils";
import { t } from "@/lang";
import { CLIPBOARD_MODE } from "@/shared/constants";

import { withName, entryLabel } from "./utils";
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
}: UseFileOperationsArgs) => {
  const { fs } = useStateContext();
  const [clipboard, setClipboard] = useState<Clipboard>(null);
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
        notify(
          permanent ? t.directory.deleted(label) : t.directory.trashed(label),
          TOAST_TYPE.SUCCESS,
        );

      setSelectedIDs([]);
      refreshDir();
    },
    [fs, refreshDir, setSelectedIDs],
  );

  const remove = useCallback(
    (targets: string[]) => deleteTargets(targets, false),
    [deleteTargets],
  );

  const removePermanently = useCallback(
    (targets: string[]) => deleteTargets(targets, true),
    [deleteTargets],
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

    if (!failed)
      notify(
        isCopy ? t.directory.pasted(label) : t.directory.moved(label),
        TOAST_TYPE.SUCCESS,
      );

    if (clipboard.mode === CLIPBOARD_MODE.CUT) setClipboard(null);
    setSelectedIDs([]);
    refreshDir();
  }, [clipboard, path, fs, refreshDir, setSelectedIDs]);

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
    paste,
    rename,
    progress,
  };
};
