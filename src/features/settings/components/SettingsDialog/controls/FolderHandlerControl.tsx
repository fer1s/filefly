import { useEffect, useState } from "react";

import Switcher from "@/shared/components/elements/Switcher";
import {
  isDefaultFolderHandler,
  setDefaultFolderHandler,
} from "@/shared/services/api";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

// Toggle for making this app macOS's default folder handler. This is OS state (Launch Services),
// not a settings.toml field, so the control reads it live on mount and writes it directly — like
// the Storage panel, it binds to no AppSettings key. Disabled until the initial read resolves.
// Takes no props (the schema renders it with CustomControlProps, which it ignores).
const FolderHandlerControl = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void isDefaultFolderHandler()
      .then((value) => active && setEnabled(value))
      .catch(() => active && setEnabled(false));
    return () => {
      active = false;
    };
  }, []);

  const onToggle = async () => {
    const next = !enabled;
    try {
      await setDefaultFolderHandler(next);
      // Re-read: Launch Services is the source of truth, so confirm the change actually took.
      const now = await isDefaultFolderHandler();
      setEnabled(now);
      notify(
        now ? t.settings.folderHandlerOn : t.settings.folderHandlerOff,
        TOAST_TYPE.SUCCESS,
      );
    } catch {
      notify(t.settings.folderHandlerError, TOAST_TYPE.ERROR);
    }
  };

  return (
    <Switcher
      checked={Boolean(enabled)}
      disabled={enabled === null}
      onChange={onToggle}
    />
  );
};

export default FolderHandlerControl;
