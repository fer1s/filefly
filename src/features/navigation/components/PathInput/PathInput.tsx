import { useState, type KeyboardEvent } from "react";

import { KEY } from "@/shared/constants";
import { t } from "@/lang";

import type { PathInputProps } from "./types";

// Editable directory path. A local draft prevents navigating on every keystroke; the parent
// remounts it (via `key={path}`) to reset the draft after any navigation. Commits on Enter/blur.
const PathInput = ({ path, onCommit }: PathInputProps) => {
  const [draft, setDraft] = useState(path);

  const commitDraft = () => {
    if (draft !== path) onCommit(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEY.ENTER) commitDraft();
  };

  return (
    <input
      type="text"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={commitDraft}
      placeholder={t.pathbar.pathPlaceholder}
      className="shadow"
    />
  );
};

export default PathInput;
