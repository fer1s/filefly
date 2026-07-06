import { DirEntry } from "@/shared/models";

export type UseNativeDropTargetArgs = {
  // Entries in view — used to know which drop targets are folders.
  entries: DirEntry[];
  // The folder to import into when files are dropped on empty space (the current directory), or
  // "" for views where that makes no sense (Volumes, Recents, Tags).
  currentDir: string;
  // Called when files are dropped (native OS drag) onto a folder in view, or the current folder.
  // `external` is true when the files came from another app (→ copy, never move).
  onDropFiles: (paths: string[], destDir: string, external: boolean) => void;
};
