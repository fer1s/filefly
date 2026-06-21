import { useCallback, useState } from "react";

import { ACCEPTED_PREVIEW_FORMATS } from "@/shared/constants";
import { DirEntry } from "@/shared/models";

// Preview modal state and prev/next navigation over the previewable files in the
// current view. `open` locates a file by path among `previewables` and shows it.
export const usePreview = (previewables: DirEntry[]) => {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(-1);

  const entry = index >= 0 ? previewables[index] : undefined;
  const filePath = entry?.path ?? "";
  const fileType = entry
    ? (entry.name.split(".").pop() || "").toLowerCase()
    : "";

  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : i)), []);
  const next = useCallback(
    () => setIndex((i) => (i < previewables.length - 1 ? i + 1 : i)),
    [previewables.length],
  );

  // Open the preview for a file path if it's a supported, previewable entry.
  const open = useCallback(
    (path: string) => {
      const extension = (path.split(".").pop() || "").toLowerCase();
      if (!ACCEPTED_PREVIEW_FORMATS.includes(extension)) return;

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
    hasPrev: index > 0,
    hasNext: index < previewables.length - 1,
    open,
  };
};
