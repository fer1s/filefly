import { useCallback, useRef, useState, type ReactNode } from "react";

import PathPickerDialog from "@/shared/components/patterns/PathPickerDialog";
import { pickFolder as nativePickFolder } from "@/shared/services/api";

import { FolderPickerContext } from "./FolderPickerContext";
import { FOLDER_PICKER_CONFIG } from "./constants";
import type { PickFolderOptions } from "./types";

// Promise-based folder picker: `const dir = await pickFolder()` resolves to a folder path or null.
// When `useCustom` is on it opens the app's own in-window PathPickerDialog (folder mode); otherwise it defers to
// the native OS (Finder) dialog. Both paths return through the same promise so call sites never
// branch on the setting. Modelled on ConfirmProvider.
export const FolderPickerProvider = ({
  useCustom,
  children,
}: {
  useCustom: boolean;
  children: ReactNode;
}) => {
  const [startPath, setStartPath] = useState<string | null>(null);
  // Held in a ref so settling doesn't depend on a stale render and survives the fade-out.
  const resolverRef = useRef<((result: string | null) => void) | null>(null);

  const pickFolder = useCallback(
    (options?: PickFolderOptions) => {
      if (!useCustom) return nativePickFolder();
      return new Promise<string | null>((resolve) => {
        resolverRef.current = resolve;
        setStartPath(options?.startPath ?? "");
      });
    },
    [useCustom],
  );

  const settle = useCallback((result: string | null) => {
    setStartPath(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  return (
    <FolderPickerContext.Provider value={{ pickFolder }}>
      {children}
      <PathPickerDialog
        visible={startPath !== null}
        config={FOLDER_PICKER_CONFIG}
        initialPath={startPath ?? ""}
        onChoose={(path) => settle(path)}
        onClose={() => settle(null)}
      />
    </FolderPickerContext.Provider>
  );
};
