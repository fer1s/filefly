import { useCallback, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import { ask } from "@tauri-apps/plugin-dialog";
import { CLIPBOARD_MODE, type ClipboardMode } from "@/shared/constants";

type Clipboard = { paths: string[]; mode: ClipboardMode } | null;

type Args = {
  path: string;
  refreshDir: () => void;
  setSelectedIDs: (ids: string[]) => void;
};

// Core filesystem operations on a list of paths, shared by the context menu and the
// keyboard shortcuts. Owns the internal copy/cut clipboard.
export const useFileOperations = ({
  path,
  refreshDir,
  setSelectedIDs,
}: Args) => {
  const { fs } = useStateContext();
  const [clipboard, setClipboard] = useState<Clipboard>(null);

  // All wrapped in useCallback so they're stable props for memoized entry rows.
  const copy = useCallback((targets: string[]) => {
    if (targets.length && targets[0])
      setClipboard({ paths: targets, mode: CLIPBOARD_MODE.COPY });
  }, []);

  const cut = useCallback((targets: string[]) => {
    if (targets.length && targets[0])
      setClipboard({ paths: targets, mode: CLIPBOARD_MODE.CUT });
  }, []);

  const remove = useCallback(
    async (targets: string[]) => {
      if (!targets.length || !targets[0]) return;

      const label =
        targets.length === 1
          ? `"${targets[0].split("/").pop()}"`
          : t.directory.items(targets.length);
      const confirmed = await ask(t.directory.confirmDelete(label), {
        title: t.directory.deleteTitle,
        kind: "warning",
      });
      if (!confirmed) return;

      for (const target of targets) {
        try {
          await fs.trash(target);
        } catch (err) {
          notify(
            t.errors.delete(target.split("/").pop() || target, String(err)),
            TOAST_TYPE.ERROR,
          );
        }
      }

      setSelectedIDs([]);
      refreshDir();
    },
    [fs, refreshDir, setSelectedIDs],
  );

  const paste = useCallback(async () => {
    if (!clipboard || path === "") return;

    for (const source of clipboard.paths) {
      try {
        if (clipboard.mode === CLIPBOARD_MODE.COPY) await fs.copy(source, path);
        else await fs.move(source, path);
      } catch (err) {
        notify(
          t.errors.paste(source.split("/").pop() || source, String(err)),
          TOAST_TYPE.ERROR,
        );
      }
    }

    if (clipboard.mode === CLIPBOARD_MODE.CUT) setClipboard(null);
    setSelectedIDs([]);
    refreshDir();
  }, [clipboard, path, fs, refreshDir, setSelectedIDs]);

  const rename = useCallback(
    async (targetPath: string, newName: string) => {
      try {
        await fs.rename(targetPath, newName);
      } catch (err) {
        notify(t.errors.rename(String(err)), TOAST_TYPE.ERROR);
      }
      refreshDir();
    },
    [fs, refreshDir],
  );

  return { clipboard, copy, cut, remove, paste, rename };
};
