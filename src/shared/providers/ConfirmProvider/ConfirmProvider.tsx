import { useCallback, useRef, useState, type ReactNode } from "react";

import ConfirmationDialog from "@/shared/components/patterns/ConfirmationDialog";

import { ConfirmContext } from "./ConfirmContext";
import type { ConfirmOptions } from "./types";

// Promise-based confirmation: `const ok = await confirm({ title, message, destructive })` opens the
// app's own ConfirmationDialog (Dialog + Button + accent) and resolves true/false. Replaces the
// native OS prompt (@tauri-apps/plugin-dialog `ask`, an NSAlert) so delete/trash confirmations look
// like the rest of the app instead of a system dialog.
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // Held in a ref (not state) so settling doesn't depend on a stale render and survives the fade-out.
  const resolverRef = useRef<((result: boolean) => void) | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setOptions(opts);
      }),
    [],
  );

  const settle = useCallback((result: boolean) => {
    setOptions(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationDialog
        visible={options !== null}
        title={options?.title ?? ""}
        message={options?.message ?? ""}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        destructive={options?.destructive}
        onConfirm={() => settle(true)}
        onClose={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
};
