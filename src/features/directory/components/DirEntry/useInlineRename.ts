import { useEffect, useRef, type KeyboardEvent } from "react";

import { KEY } from "@/shared/constants";

// Inline rename for one entry: focuses the input and preselects the base name (without the
// extension) when editing starts, and commits on Enter / blur (cancels on Escape). A done-ref
// guards against the blur-after-Enter double fire.
export const useInlineRename = (
  entryName: string,
  entryPath: string,
  renaming: boolean,
  onRename: (path: string, newName: string) => void,
  onCancelRename: () => void,
) => {
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameDoneRef = useRef(false);

  useEffect(() => {
    if (!renaming || !renameInputRef.current) return;
    renameDoneRef.current = false;
    const el = renameInputRef.current;
    el.focus();
    const dot = entryName.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : entryName.length);
  }, [entryName, renaming]);

  const submitRename = () => {
    if (renameDoneRef.current) return;
    renameDoneRef.current = true;
    const value = renameInputRef.current?.value.trim();
    if (value && value !== entryName) onRename(entryPath, value);
    else onCancelRename();
  };

  const cancelRename = () => {
    if (renameDoneRef.current) return;
    renameDoneRef.current = true;
    onCancelRename();
  };

  const handleRenameKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === KEY.ENTER) submitRename();
    else if (event.key === KEY.ESCAPE) cancelRename();
  };

  return { renameInputRef, submitRename, cancelRename, handleRenameKeyDown };
};
