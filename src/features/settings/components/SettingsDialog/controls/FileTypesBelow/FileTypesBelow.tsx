import { type KeyboardEvent } from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

import DeletableChip from "@/shared/components/elements/DeletableChip";
import TextInput from "@/shared/components/elements/TextInput";
import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { FILE_ICON_REGISTRY } from "@/features/directory";
import { FILE_CATEGORY_COLORS, KEY } from "@/shared/constants";
import { t } from "@/lang";
import "@/styles/components/FileTypesBelow.css";

import type { CustomControlProps } from "../../../../schema";
import { categoryLabel } from "./constants";
import { useFileTypeEditor } from "./useFileTypeEditor";

// Category cards reuse the persisted extension editor; only the active card exposes an input.
const FileTypesBelow = (props: CustomControlProps) => {
  const {
    categories,
    extensions,
    category,
    editing,
    beginAdd,
    cancelAdd,
    draft,
    changeDraft,
    duplicate,
    add,
    remove,
  } = useFileTypeEditor(props);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEY.ENTER) {
      event.preventDefault();
      add();
    }
    if (event.key === KEY.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      cancelAdd();
    }
  };

  return (
    <div className="settings_file_types">
      {categories.map((option) => (
        <div key={option} className="settings_file_types_card">
          <div className="settings_file_types_summary">
            <span
              className="settings_file_types_icon"
              style={{ backgroundColor: FILE_CATEGORY_COLORS[option] }}
            >
              <Icon icon={FILE_ICON_REGISTRY[option]} />
            </span>
            <div className="settings_file_types_description">
              <h4>{categoryLabel(option)}</h4>
              <p>{t.settings.fileTypeDescriptions[option]}</p>
            </div>
          </div>
          <div className="settings_file_types_chips">
            {extensions[option].length === 0 ? (
              <span className="settings_row_hint">
                {t.settings.fileTypesEmpty}
              </span>
            ) : (
              extensions[option].map((ext) => (
                <DeletableChip
                  key={ext}
                  removeLabel={t.settings.fileTypesRemove}
                  onDelete={() => remove(option, ext)}
                >
                  {ext}
                </DeletableChip>
              ))
            )}
          </div>
          <Button
            className="settings_button settings_file_types_add"
            onClick={() => beginAdd(option)}
            aria-label={t.settings.fileTypesAddTo(categoryLabel(option))}
            aria-expanded={editing && category === option}
          >
            <Icon icon={faPlus} />
            {t.settings.fileTypesAddShort}
          </Button>
          {editing && category === option && (
            <div className="settings_file_types_editor">
              <div className="settings_file_types_input">
                <TextInput
                  className="settings_input"
                  value={draft}
                  placeholder={t.settings.fileTypesPlaceholder}
                  aria-label={t.settings.fileTypesAddTo(categoryLabel(option))}
                  aria-invalid={!!duplicate}
                  onChange={(event) => changeDraft(event.target.value)}
                  onKeyDown={onKeyDown}
                  spellCheck={false}
                  autoFocus
                  // eslint-disable-next-line i18next/no-literal-string -- HTML input attribute value
                  autoCapitalize="off"
                  // eslint-disable-next-line i18next/no-literal-string -- HTML input attribute value
                  autoCorrect="off"
                />
                <Button
                  className="settings_button"
                  onClick={add}
                  disabled={!draft.trim()}
                >
                  {t.settings.fileTypesAdd}
                </Button>
                <Button className="settings_button" onClick={cancelAdd}>
                  {t.common.cancel}
                </Button>
              </div>
              {duplicate && (
                <span className="settings_file_types_error" role="alert">
                  {t.settings.fileTypesDuplicate(
                    duplicate.extension,
                    categoryLabel(duplicate.category),
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FileTypesBelow;
