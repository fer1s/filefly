import { useCallback, useRef, useState, type ReactNode } from "react";

import { basename, dirname } from "@/shared/utils";

import CompressDialog from "./CompressDialog";
import PasswordDialog from "./PasswordDialog";
import { CompressContext } from "./CompressContext";
import type { ArchiveFormat, CompressValues } from "./types";

// Owns only the compress-options dialog. `requestOptions(targets)` opens it and resolves the chosen
// options (or null on cancel); the directory's file operations run the actual compression so it
// shares the status-bar progress bar and the clickable "reveal the archive" toast. Modelled on
// ConfirmProvider (promise + resolver ref that survives the fade-out).
export const CompressProvider = ({ children }: { children: ReactNode }) => {
  const [defaultName, setDefaultName] = useState<string | null>(null);
  const [ext, setExt] = useState<ArchiveFormat>("zip");
  // Held in a ref so settling doesn't depend on a stale render and survives the fade-out.
  const resolverRef = useRef<((value: CompressValues | null) => void) | null>(
    null,
  );

  // Extraction password prompt — same promise + resolver-ref pattern as the compress dialog.
  const [passwordVisible, setPasswordVisible] = useState(false);
  const passwordResolverRef = useRef<((value: string | null) => void) | null>(
    null,
  );

  const requestOptions = useCallback(
    (targets: string[], format: ArchiveFormat = "zip") =>
      new Promise<CompressValues | null>((resolve) => {
        if (!targets.length || !targets[0]) {
          resolve(null);
          return;
        }
        // One item → its own name; many → the parent folder's name (falling back to "Archive").
        const stem =
          targets.length === 1
            ? basename(targets[0])
            : basename(dirname(targets[0])) || "Archive";
        resolverRef.current = resolve;
        setExt(format);
        setDefaultName(`${stem}.${format}`);
      }),
    [],
  );

  const settle = useCallback((value: CompressValues | null) => {
    setDefaultName(null);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const requestPassword = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        passwordResolverRef.current = resolve;
        setPasswordVisible(true);
      }),
    [],
  );

  const settlePassword = useCallback((value: string | null) => {
    setPasswordVisible(false);
    passwordResolverRef.current?.(value);
    passwordResolverRef.current = null;
  }, []);

  return (
    <CompressContext.Provider value={{ requestOptions, requestPassword }}>
      {children}
      <CompressDialog
        visible={defaultName !== null}
        defaultName={defaultName ?? ""}
        ext={ext}
        onSubmit={(values) => settle(values)}
        onClose={() => settle(null)}
      />
      <PasswordDialog
        visible={passwordVisible}
        onSubmit={(password) => settlePassword(password)}
        onClose={() => settlePassword(null)}
      />
    </CompressContext.Provider>
  );
};
