import { useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import type { DirEntry } from "@/shared/models";

// State for the sidebar's Properties dialog. The sidebar lives outside the DirectoryProvider, so
// it can't reuse the directory's properties state; it resolves the entry fresh via `fs.getEntry`
// (works for any real path) and drives the shared Properties dialog itself.
export const useSidebarProperties = () => {
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
