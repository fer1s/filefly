import { useEffect, useRef, type KeyboardEvent } from "react";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";
import { KEY } from "@/shared/constants";
import { t } from "@/lang";

import "@/styles/components/PathSearch.css";

import type { PathSearchProps } from "./types";

// Inline filter for the current folder, expanded from the PathBar's search button (which it
// replaces while open). Bound to the per-tab `search` state. Escape closes it; an empty blur
// closes it too. Animates in on mount and out via the `closing` class (then unmounts on onExited).
const PathSearch = ({
  value,
  onChange,
  onClose,
  closing,
  onExited,
}: PathSearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEY.ESCAPE) {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className={classNames("PathSearch", "shadow", closing && "closing")}
      onAnimationEnd={(event) => {
        if (closing && event.target === event.currentTarget) onExited();
      }}
    >
      <Icon className="path_search_icon" icon={faMagnifyingGlass} />
      <input
        ref={inputRef}
        type="text"
        className="path_search_input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!value) onClose();
        }}
        placeholder={t.pathbar.searchPlaceholder}
      />
    </div>
  );
};

export default PathSearch;
