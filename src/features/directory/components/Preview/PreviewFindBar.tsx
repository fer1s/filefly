import {
  faChevronUp,
  faChevronDown,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import IconButton from "@/shared/components/elements/IconButton";
import TextInput from "@/shared/components/elements/TextInput";
import { t } from "@/lang";

import type { PreviewFindBarProps } from "./types";

// The in-editor find bar (query input + match count + prev/next/close). Purely presentational —
// all state and match navigation live in useMarkdownPreview.
const PreviewFindBar = ({
  inputRef,
  query,
  matchCount,
  matchIndex,
  onQueryChange,
  onKeyDown,
  onPrev,
  onNext,
  onClose,
}: PreviewFindBarProps) => (
  <div className="preview_find">
    <TextInput
      unstyled
      ref={inputRef}
      className="preview_find_input"
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={t.markdownEditor.findPlaceholder}
      spellCheck={false}
      autoFocus
    />
    <span className="preview_find_count">
      {matchCount
        ? `${Math.min(matchIndex, matchCount - 1) + 1}/${matchCount}`
        : query
          ? t.markdownEditor.noResults
          : ""}
    </span>
    <IconButton
      icon={faChevronUp}
      onClick={onPrev}
      disabled={!matchCount}
      tooltip={t.markdownEditor.previousMatch}
      aria-label={t.markdownEditor.previousMatch}
    />
    <IconButton
      icon={faChevronDown}
      onClick={onNext}
      disabled={!matchCount}
      tooltip={t.markdownEditor.nextMatch}
      aria-label={t.markdownEditor.nextMatch}
    />
    <IconButton
      icon={faXmark}
      onClick={onClose}
      tooltip={t.common.close}
      aria-label={t.common.close}
    />
  </div>
);

export default PreviewFindBar;
