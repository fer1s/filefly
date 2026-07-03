import { useEffect, useState } from "react";

import { faCheck, faMinus } from "@fortawesome/free-solid-svg-icons";

import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";
import { KEY, TAG_COLOR } from "@/shared/constants";
import { TAG_PICKER_COLORS } from "@/features/directory/constants";
import { useTags } from "@/shared/providers/TagsProvider";
import type { Tag } from "@/shared/models";
import { t } from "@/lang";

import { TAG_COVERAGE, type TagCoverage } from "./constants";
import type { TagPickerProps } from "./types";

import "@/styles/components/TagPicker.css";

// Finder-style tag controls in the context menu: a colour-swatch row, a checklist of the user's
// named (uncoloured) tags, and an input to create a new one. Toggling applies across the whole
// selection; a mixed selection shows a "some" (partial) state. Reads/writes the shared tag state.
export const TagPicker = ({ targets, onClose }: TagPickerProps) => {
  const { tags, loadTags, setEntryTags, allTags } = useTags();
  const [draft, setDraft] = useState("");

  const key = targets.join("\n");
  useEffect(() => {
    void loadTags(targets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTags, key]);

  const coverage = (has: (current: Tag[]) => boolean): TagCoverage => {
    const n = targets.filter((path) => has(tags[path] ?? [])).length;
    if (n === 0) return TAG_COVERAGE.NONE;
    return n === targets.length ? TAG_COVERAGE.ALL : TAG_COVERAGE.SOME;
  };

  // Apply a per-file transform to every target.
  const apply = (build: (current: Tag[]) => Tag[]) =>
    Promise.all(
      targets.map((path) => setEntryTags(path, build(tags[path] ?? []))),
    );

  // Add the tag where missing, or remove it everywhere when every target already has it.
  const toggle = async (
    has: (tag: Tag) => boolean,
    cover: TagCoverage,
    make: () => Tag,
  ) => {
    await apply((current) =>
      cover === TAG_COVERAGE.ALL
        ? current.filter((tag) => !has(tag))
        : current.some(has)
          ? current
          : [...current, make()],
    );
    onClose();
  };

  const toggleColor = (color: number, name: string) =>
    toggle(
      (tag) => tag.color === color,
      coverage((current) => current.some((tag) => tag.color === color)),
      () => ({ name, color }),
    );

  const toggleName = (name: string, color: number) =>
    toggle(
      (tag) => tag.name === name,
      coverage((current) => current.some((tag) => tag.name === name)),
      () => ({ name, color }),
    );

  const addDraft = async () => {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    await apply((current) =>
      current.some((tag) => tag.name === name)
        ? current
        : [...current, { name, color: TAG_COLOR.NONE }],
    );
    onClose();
  };

  // Named, uncoloured tags listed below the swatches (colours are covered by the swatch row).
  const namedTags = allTags.filter((tag) => tag.color === TAG_COLOR.NONE);

  return (
    <div className="tag_picker">
      <div className="tag_swatches" role="group" aria-label={t.tags.label}>
        {TAG_PICKER_COLORS.map(({ index, class: colorClass }) => {
          const name = t.tags.colors[colorClass];
          const cover = coverage((current) =>
            current.some((tag) => tag.color === index),
          );
          return (
            <button
              key={index}
              type="button"
              className={classNames(
                "tag_swatch",
                colorClass,
                cover === TAG_COVERAGE.ALL && "active",
                cover === TAG_COVERAGE.SOME && "partial",
              )}
              title={name}
              aria-label={name}
              aria-pressed={cover === TAG_COVERAGE.ALL}
              onClick={() => toggleColor(index, name)}
            />
          );
        })}
      </div>

      {namedTags.length > 0 && (
        <ul className="tag_list">
          {namedTags.map((tag) => {
            const cover = coverage((current) =>
              current.some((entry) => entry.name === tag.name),
            );
            return (
              <li key={tag.name}>
                <button
                  type="button"
                  className={classNames(
                    "tag_list_item",
                    cover !== TAG_COVERAGE.NONE && "checked",
                  )}
                  onClick={() => toggleName(tag.name, tag.color)}
                >
                  <span className="tag_check" aria-hidden>
                    {cover === TAG_COVERAGE.ALL ? (
                      <Icon icon={faCheck} />
                    ) : cover === TAG_COVERAGE.SOME ? (
                      <Icon icon={faMinus} />
                    ) : null}
                  </span>
                  {tag.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <input
        className="tag_input"
        placeholder={t.tags.add}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === KEY.ENTER) addDraft();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
