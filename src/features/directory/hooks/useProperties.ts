import { useRef, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import { DirEntry } from "@/shared/models";

// State for Properties. `open` resolves one entry; `openMany` resolves a selection and totals its sizes:
// the current directory is fetched fresh (it isn't in `dirContent`), other entries
// are looked up in the already-loaded listing, falling back to a fresh fetch when
// absent (e.g. search results live in subfolders, not in `dirContent`).
export const useProperties = () => {
  const { fs, dirContent, volumes } = useStateContext();
  const [entry, setEntry] = useState<DirEntry | null>(null);
  const [aggregate, setAggregate] = useState<{
    count: number;
    size: number | null;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const requestId = useRef(0);

  const resolveEntry = async (targetId: string) =>
    dirContent.find((item) => item.path === targetId) ??
    (await fs.getEntry(targetId));

  const open = async (targetId: string, isCurrentDirectory: boolean) => {
    requestId.current += 1;
    const currentRequest = requestId.current;
    try {
      const resolved = isCurrentDirectory
        ? await fs.getEntry(targetId)
        : await resolveEntry(targetId);

      if (!resolved || requestId.current !== currentRequest) return;
      setAggregate(null);
      setEntry(resolved);
      setVisible(true);
    } catch (error) {
      notify(t.errors.properties(String(error)), TOAST_TYPE.ERROR);
    }
  };

  const openMany = async (targetIds: string[]) => {
    requestId.current += 1;
    const currentRequest = requestId.current;
    try {
      const resolved = await Promise.all(targetIds.map(resolveEntry));
      const entries = resolved.filter(
        (item): item is DirEntry => item !== null,
      );
      if (
        requestId.current !== currentRequest ||
        entries.length !== targetIds.length ||
        entries.length < 2
      )
        return;

      setEntry(entries[0]);
      setAggregate({ count: entries.length, size: null });
      setVisible(true);
      const sizes = await Promise.all(
        entries.map(async (item) => {
          if (!item.metadata.isDir) return item.size;
          const volume = volumes.find(
            (candidate) => candidate.mountPoint === item.path,
          );
          if (volume)
            return Math.max(0, volume.totalBytes - volume.availableBytes);
          return fs.getDirSize(item.path).catch(() => 0);
        }),
      );
      if (requestId.current !== currentRequest) return;
      setAggregate({
        count: entries.length,
        size: sizes.reduce((total, size) => total + size, 0),
      });
    } catch (error) {
      notify(t.errors.properties(String(error)), TOAST_TYPE.ERROR);
    }
  };

  const close = () => {
    requestId.current += 1;
    setVisible(false);
  };

  return { entry, aggregate, visible, open, openMany, close };
};
