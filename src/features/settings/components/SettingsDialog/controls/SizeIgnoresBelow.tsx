import { useState, type KeyboardEvent } from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

import DeletableChip from "@/shared/components/elements/DeletableChip";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { t } from "@/lang";

import type { CustomControlProps } from "../../../schema";

// Full-width editor for the size-ignore patterns: an input (Enter or the Add button appends) plus a
// chip per active pattern with a remove button. Patterns are trimmed and de-duplicated on add;
// removing empties the list back to "everything counts". The saved list is pushed to the backend
// through the normal settings write, which replaces the size-index globs and clears the cache.
const SizeIgnoresBelow = ({ settings, update }: CustomControlProps) => {
  const [draft, setDraft] = useState("");
  const patterns = settings.sizeIgnores;

  const add = () => {
    const value = draft.trim();
    if (!value || patterns.includes(value)) {
      setDraft("");
      return;
    }
    update({ sizeIgnores: [...patterns, value] });
    setDraft("");
  };

  const remove = (pattern: string) =>
    update({ sizeIgnores: patterns.filter((p) => p !== pattern) });

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  };

  return (
    <div className="settings_ignores">
      <div className="settings_ignores_input">
        <input
          type="text"
          className="settings_input"
          value={draft}
          placeholder={t.settings.sizeIgnoresPlaceholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <IconButton
          icon={faPlus}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
          onClick={add}
          disabled={!draft.trim()}
          tooltip={t.settings.sizeIgnoresAdd}
          aria-label={t.settings.sizeIgnoresAdd}
        />
      </div>
      {patterns.length === 0 ? (
        <span className="settings_row_hint">{t.settings.sizeIgnoresEmpty}</span>
      ) : (
        <div className="settings_ignores_chips">
          {patterns.map((pattern) => (
            <DeletableChip
              key={pattern}
              removeLabel={t.settings.sizeIgnoresRemove}
              onDelete={() => remove(pattern)}
            >
              {pattern}
            </DeletableChip>
          ))}
        </div>
      )}
    </div>
  );
};

export default SizeIgnoresBelow;
