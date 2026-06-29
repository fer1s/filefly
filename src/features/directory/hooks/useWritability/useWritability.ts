import { useCallback, useEffect, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";

import { NTFS_FILE_SYSTEM } from "./constants";
import { volumeForPath } from "./utils";

// Detects a read-only NTFS volume for the active folder. macOS reports NTFS space but rejects
// writes without a driver, so when the current folder is on an NTFS volume we write-probe it to
// learn the truth. `recheck` re-probes (after the user installs a driver). Non-NTFS volumes are
// assumed writable and never probed.
export const useWritability = () => {
  const { fs, path, volumes } = useStateContext();
  const [readOnly, setReadOnly] = useState(false);

  const volume = volumeForPath(path, volumes);
  const isNtfs = volume?.fileSystem === NTFS_FILE_SYSTEM;

  // Only probes for NTFS folders (writes async). The non-NTFS case is handled by masking the
  // result with `isNtfs` below, so no synchronous setState is needed here.
  const probe = useCallback(() => {
    if (!isNtfs || !path) return;
    fs.canWrite(path)
      .then((writable) => setReadOnly(!writable))
      .catch(() => setReadOnly(false));
  }, [fs, path, isNtfs]);

  useEffect(() => {
    probe();
  }, [probe]);

  return { isNtfsReadOnly: isNtfs && readOnly, recheck: probe };
};
