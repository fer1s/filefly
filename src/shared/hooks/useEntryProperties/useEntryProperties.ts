import { useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import type { DirEntry } from "@/shared/models";

// Self-contained state for a Properties dialog driven from outside the DirectoryProvider (sidebar,
// volumes view): resolves the entry fresh via `fs.getEntry` (works for any real path) and drives
// the shared Properties dialog. Pair with the exported `Properties` component.
export const useEntryProperties = () => {
  const { fs } = useStateContext();
  const [entry, setEntry] = useState<DirEntry | null>(null);
  const [visible, setVisible] = useState(false);

  const open = async (path: string) => {
    try {
      const resolved = await fs.getEntry(path);
      setEntry(resolved);
      setVisible(true);
    } catch (error) {
      notify(t.errors.properties(String(error)), TOAST_TYPE.ERROR);
    }
  };

  return { entry, visible, open, close: () => setVisible(false) };
};
