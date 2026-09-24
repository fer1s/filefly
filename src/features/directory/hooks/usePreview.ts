import { useCallback, useEffect, useMemo, useState } from "react";

import { isPreviewable } from "@/features/directory/constants";
import { useFileTypeExtensions } from "@/features/directory/formats";
import { extension } from "@/shared/utils";
import { DirEntry } from "@/shared/models";

// Preview modal state and prev/next navigation over the previewable files in the
// current view. `open` locates a file by path among `previewables` and shows it.
export const usePreview = (previewables: DirEntry[]) => {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(-1);
  const [selectedPath, setSelectedPath] = useState("");
  const fileTypes = useFileTypeExtensions();

  // Keep the opened file's identity when sorting or refreshing changes its position. Only fall
  // back to the previous position when that file disappears (e.g. after moving it to Trash).
  const selectedIndex = previewables.findIndex(
    (entry) => entry.path === selectedPath,
  );
  const safeIndex =
    selectedIndex >= 0
      ? selectedIndex
      : index >= 0 && previewables.length
        ? Math.min(index, previewables.length - 1)
        : -1;

  const entry = safeIndex >= 0 ? previewables[safeIndex] : undefined;
  const filePath = entry?.path ?? "";
  const fileType = entry ? extension(entry.name) : "";

  // Remember the current position for deletion fallback and adopt the replacement's identity
  // before rendering children, so later refreshes cannot silently switch to another file.
  if (index !== safeIndex || selectedPath !== filePath) {
    setIndex(safeIndex);
    setSelectedPath(filePath);
  }

  // Close when the previewed file was the only previewable and is now gone. Syncing to an external
  // change (the filesystem, surfaced via `previewables`), which is the intended use of an effect —
  // there's no in-render way to drop the now-orphaned `visible`.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible && previewables.length === 0) setVisible(false);
  }, [visible, previewables.length]);

  // Navigation changes identity as well as position in the current list.
  const prev = useCallback(() => {
    if (safeIndex <= 0) return;
    setIndex(safeIndex - 1);
    setSelectedPath(previewables[safeIndex - 1].path);
  }, [safeIndex, previewables]);
  const next = useCallback(() => {
    if (safeIndex < 0 || safeIndex >= previewables.length - 1) return;
    setIndex(safeIndex + 1);
    setSelectedPath(previewables[safeIndex + 1].path);
  }, [safeIndex, previewables]);

  // Open the preview for a file path if it's a supported, previewable entry.
  const open = useCallback(
    (path: string) => {
      const ext = extension(path);
      if (!isPreviewable(fileTypes, ext)) return;

      const i = previewables.findIndex((e) => e.path === path);
      if (i < 0) return;

      setIndex(i);
      setSelectedPath(path);
      setVisible(true);
    },
    [previewables, fileTypes],
  );

  // Memoized so the returned object has a stable identity across renders. Consumers put it in
  // effect/callback deps (e.g. useKeyboardNav's onOpen chain); a fresh object every render made
  // that effect re-subscribe on every keystroke, and its cleanup wiped the type-to-find buffer —
  // the popup dropped letters. It only changes when its actual contents do.
  return useMemo(
    () => ({
      visible,
      setVisible,
      filePath,
      fileType,
      prev,
      next,
      hasPrev: safeIndex > 0,
      hasNext: safeIndex >= 0 && safeIndex < previewables.length - 1,
      open,
    }),
    [
      visible,
      setVisible,
      filePath,
      fileType,
      prev,
      next,
      safeIndex,
      previewables.length,
      open,
    ],
  );
};
