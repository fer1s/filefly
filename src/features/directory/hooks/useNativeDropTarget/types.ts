import { DirEntry } from "@/shared/models";

export type UseNativeDropTargetArgs = {
  // Entries in view — used to know which drop targets are folders.
  entries: DirEntry[];
  // Called when files are dropped (native OS drag) onto a folder in view.
  onDropFiles: (paths: string[], destDir: string) => void;
};
