import { classNames } from "@/shared/utils";
import type { Tag } from "@/shared/models";
import { TAG_COLOR, TAG_COLOR_CLASS } from "@/shared/constants";

import "@/styles/components/TagDots.css";

// Coloured dots for a file's Finder tags (Finder-style). Decorative — the tag name is in the
// title attribute for hover; nothing renders when the file has no tags.
export const TagDots = ({ tags }: { tags: Tag[] }) => {
  if (!tags.length) return null;
  return (
    <span className="tag_dots" aria-hidden>
      {tags.map((tag, i) => (
        <span
          key={`${tag.name}#${i}`}
          className={classNames(
            "tag_dot",
            TAG_COLOR_CLASS[tag.color] ?? TAG_COLOR_CLASS[TAG_COLOR.NONE],
          )}
          title={tag.name}
        />
      ))}
    </span>
  );
};
