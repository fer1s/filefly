import { useEffect } from "react";

import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import { TAG_PICKER_COLORS } from "../../constants";
import { useDirectory } from "../../providers/DirectoryProvider";

type TagPickerProps = {
  // The entries the menu acts on (the clicked one, or the whole selection).
  targets: string[];
  onClose: () => void;
};

// Finder-style row of colour swatches at the top of the context menu. Clicking a colour toggles
// that tag across all targets (active = every target already has it). Reads/writes the shared
// directory tag state, so the rows update immediately.
export const TagPicker = ({ targets, onClose }: TagPickerProps) => {
  const { tags, loadTags, setEntryTags } = useDirectory();

  const key = targets.join("\n");
  useEffect(() => {
    void loadTags(targets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTags, key]);

  const isActive = (color: number) =>
    targets.length > 0 &&
    targets.every((path) =>
      (tags[path] ?? []).some((tag) => tag.color === color),
    );

  const toggle = async (color: number, name: string) => {
    const active = isActive(color);
    await Promise.all(
      targets.map((path) => {
        const current = tags[path] ?? [];
        const next = active
          ? current.filter((tag) => tag.color !== color)
          : current.some((tag) => tag.color === color)
            ? current
            : [...current, { name, color }];
        return setEntryTags(path, next);
      }),
    );
    onClose();
  };

  return (
    <div className="tag_picker" role="group" aria-label={t.tags.label}>
      {TAG_PICKER_COLORS.map(({ index, class: colorClass }) => {
        const name = t.tags.colors[colorClass];
        return (
          <button
            key={index}
            type="button"
            className={classNames(
              "tag_swatch",
              colorClass,
              isActive(index) && "active",
            )}
            title={name}
            aria-label={name}
            aria-pressed={isActive(index)}
            onClick={() => toggle(index, name)}
          />
        );
      })}
    </div>
  );
};
