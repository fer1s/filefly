import { useCallback } from "react";

import { useCompress } from "@/shared/providers/CompressProvider";
import { archiveEncrypted } from "@/shared/services/api";

// The subset of file operations the archive menu actions drive. compress/extract own the status-bar
// progress + reveal toast (see useFileOperations); the dialog only collects options.
type ArchiveOps = {
  compress: (
    targets: string[],
    options: { name: string; level: number; password?: string },
  ) => Promise<void>;
  extract: (
    archivePath: string,
    password?: string,
    intoSubfolder?: boolean,
  ) => Promise<void>;
};

// Bridges the compress-options dialog (CompressProvider) to the directory file operations: compress
// opens the dialog then runs the op with the chosen options; extract checks whether the archive is
// encrypted and, if so, prompts for a password first. Returns the onCompress/onExtract handlers the
// context-menu ctx builders drop into EntryActionContext.
export const useArchiveActions = (fileOps: ArchiveOps) => {
  const { requestOptions, requestPassword } = useCompress();

  const onCompress = useCallback(
    async (targets: string[]) => {
      const options = await requestOptions(targets);
      if (options) await fileOps.compress(targets, options);
    },
    [requestOptions, fileOps],
  );

  // Shared by both extract actions: prompt for a password only when the archive needs one (cancel
  // aborts), then run the op in the requested layout. Returns nothing; the op owns progress/toast.
  const runExtract = useCallback(
    async (archivePath: string, intoSubfolder: boolean) => {
      if (!archivePath) return;
      let password: string | undefined;
      if (await archiveEncrypted(archivePath).catch(() => false)) {
        const entered = await requestPassword();
        if (entered === null) return;
        password = entered;
      }
      await fileOps.extract(archivePath, password, intoSubfolder);
    },
    [requestPassword, fileOps],
  );

  const onExtract = useCallback(
    (archivePath: string) => void runExtract(archivePath, false),
    [runExtract],
  );

  const onExtractToFolder = useCallback(
    (archivePath: string) => void runExtract(archivePath, true),
    [runExtract],
  );

  return { onCompress, onExtract, onExtractToFolder };
};
