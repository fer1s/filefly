import { useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import { DirEntry } from "@/shared/models";

// State for the Properties modal. `open` resolves the entry for the given path:
// the current directory is fetched fresh (it isn't in `dirContent`), other entries
// are looked up in the already-loaded listing.
export const useProperties = () => {
  const { fs, dirContent } = useStateContext();
  const [entry, setEntry] = useState<DirEntry | null>(null);
  const [visible, setVisible] = useState(false);

  const open = async (targetId: string, isCurrentDirectory: boolean) => {
    try {
      const resolved = isCurrentDirectory
        ? await fs.getEntry(targetId)
        : dirContent.find((item) => item.path === targetId);

      if (!resolved) return;
      setEntry(resolved);
      setVisible(true);
    } catch (error) {
      notify(t.errors.properties(String(error)), TOAST_TYPE.ERROR);
    }
  };

  return { entry, visible, open, close: () => setVisible(false) };
};
