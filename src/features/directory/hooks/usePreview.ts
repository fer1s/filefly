import { useCallback, useEffect, useState } from "react";

import { ACCEPTED_PREVIEW_FORMATS } from "@/shared/constants";
import { extension } from "@/shared/utils";
import { DirEntry } from "@/shared/models";

// Preview modal state and prev/next navigation over the previewable files in the
// current view. `open` locates a file by path among `previewables` and shows it.
export const usePreview = (previewables: DirEntry[]) => {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(-1);

  // Clamp the index to the live list (derived, no state write). When the open file is trashed the
  // list shifts down, so the same index now points at the next file ("advance to next" for free);
  // if it was the last one, this falls back to the new last (the previous file).
  const safeIndex =
    index >= 0 && previewables.length
      ? Math.min(index, previewables.length - 1)
      : -1;

  const entry = safeIndex >= 0 ? previewables[safeIndex] : undefined;
  const filePath = entry?.path ?? "";
  const fileType = entry ? extension(entry.name) : "";

  // Close when the previewed file was the only previewable and is now gone. Syncing to an external
  // change (the filesystem, surfaced via `previewables`), which is the intended use of an effect —
  // there's no in-render way to drop the now-orphaned `visible`.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible && previewables.length === 0) setVisible(false);
  }, [visible, previewables.length]);

  // prev/next move relative to the displayed position (safeIndex), so a stale index left by a
  // delete self-corrects on the next navigation.
  const prev = useCallback(
    () => setIndex(safeIndex > 0 ? safeIndex - 1 : safeIndex),
    [safeIndex],
  );
  const next = useCallback(
    () =>
      setIndex(
        safeIndex < previewables.length - 1 ? safeIndex + 1 : safeIndex,
      ),
    [safeIndex, previewables.length],
  );

  // Open the preview for a file path if it's a supported, previewable entry.
  const open = useCallback(
    (path: string) => {
      const ext = extension(path);
      if (!ACCEPTED_PREVIEW_FORMATS.includes(ext)) return;

      const i = previewables.findIndex((e) => e.path === path);
      if (i < 0) return;

      setIndex(i);
      setVisible(true);
    },
    [previewables],
  );

  return {
    visible,
    setVisible,
    filePath,
    fileType,
    prev,
    next,
    hasPrev: safeIndex > 0,
    hasNext: safeIndex >= 0 && safeIndex < previewables.length - 1,
    open,
  };
};
