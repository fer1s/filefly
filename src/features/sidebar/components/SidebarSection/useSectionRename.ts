import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { KEY } from "@/shared/constants";

// Inline rename for a sidebar group title. Click the title to start editing; Enter commits the
// new name, while Escape or losing focus (blur / click outside) discards it. A done-ref guards
// against the blur-after-Enter double fire. Rename is disabled when no `onRename` is given.
export const useSectionRename = (
  title: string,
  onRename?: (name: string) => void,
) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!editing || !inputRef.current) return;
    doneRef.current = false;
    const el = inputRef.current;
    el.focus();
    el.select();
  }, [editing]);

  const start = () => {
    if (onRename) setEditing(true);
  };

  const commit = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const value = inputRef.current?.value.trim();
    if (value && value !== title) onRename?.(value);
    setEditing(false);
  };

  const cancel = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === KEY.ENTER) commit();
    else if (event.key === KEY.ESCAPE) cancel();
  };

  return { editing, inputRef, start, commit, cancel, handleKeyDown };
};
