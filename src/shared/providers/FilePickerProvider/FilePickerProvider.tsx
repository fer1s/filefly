import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import PathPickerDialog, {
  type PickerConfig,
} from "@/shared/components/patterns/PathPickerDialog";
import { pickFile as nativePickFile } from "@/shared/services/api";

import { FilePickerContext } from "./FilePickerContext";
import { FILE_PICKER_CONFIG } from "./constants";
import type { PickFileOptions, PendingFilePick } from "./types";

// Promise-based file picker: `const file = await pickFile()` resolves to a file path or null.
// When `useCustom` is on it opens the app's own in-window PathPickerDialog (file mode); otherwise
// it defers to the native OS (Finder) dialog. Both paths return through the same promise so call
// sites never branch on the setting. Mirrors FolderPickerProvider.
export const FilePickerProvider = ({
  useCustom,
  children,
}: {
  useCustom: boolean;
  children: ReactNode;
}) => {
  const [pending, setPending] = useState<PendingFilePick | null>(null);
  // Held in a ref so settling doesn't depend on a stale render and survives the fade-out.
  const resolverRef = useRef<((result: string | null) => void) | null>(null);

  const pickFile = useCallback(
    (options?: PickFileOptions) => {
      if (!useCustom) return nativePickFile(options?.extensions);
      return new Promise<string | null>((resolve) => {
        resolverRef.current = resolve;
        setPending({
          startPath: options?.startPath ?? "",
          extensions: options?.extensions,
        });
      });
    },
    [useCustom],
  );

  const settle = useCallback((result: string | null) => {
    setPending(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  // Rebuild the file-mode config only when the requested extensions change (the rest is static).
  const config = useMemo<PickerConfig>(
    () => ({ ...FILE_PICKER_CONFIG, extensions: pending?.extensions }),
    [pending?.extensions],
  );

  return (
    <FilePickerContext.Provider value={{ pickFile }}>
      {children}
      <PathPickerDialog
        visible={pending !== null}
        config={config}
        initialPath={pending?.startPath ?? ""}
        onChoose={(path) => settle(path)}
        onClose={() => settle(null)}
      />
    </FilePickerContext.Provider>
  );
};
