import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import TextInput from "@/shared/components/elements/TextInput";
import { KEY } from "@/shared/constants";
import { t } from "@/lang";

import type { PathInputProps } from "./types";

// Editable directory path. A local draft prevents navigating on every keystroke; the parent
// remounts it (via `key={path}`) to reset the draft after any navigation. Commits on Enter/blur,
// and (when used as the breadcrumbs' edit mode) leaves edit mode via onExit on Enter/blur/Escape.
const PathInput = ({ path, onCommit, autoFocus, onExit }: PathInputProps) => {
  const [draft, setDraft] = useState(path);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus + select on mount so the raw path is immediately ready to copy or overwrite.
  useEffect(() => {
    if (autoFocus) inputRef.current?.select();
  }, [autoFocus]);

  const commitDraft = () => {
    if (draft !== path) onCommit(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEY.ENTER) {
      commitDraft();
      onExit?.();
    } else if (event.key === KEY.ESCAPE) {
      onExit?.(); // cancel without committing
    }
  };

  return (
    <TextInput
      unstyled
      ref={inputRef}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        commitDraft();
        onExit?.();
      }}
      placeholder={t.pathbar.pathPlaceholder}
      className="shadow"
    />
  );
};

export default PathInput;
