import {
  FILE_CATEGORY_COLORS,
  TAG_COLOR,
  TAG_COLOR_CLASS,
} from "@/shared/constants";

import { categoryOf } from "./utils";
import type { EntryIconColorArgs } from "./types";

// The inline colour for an entry's glyph, or undefined to keep the surface's default. Folders take
// their first coloured Finder tag; files take their category colour when `colorfulFileTypes` is on.
// One owner so the directory entries and the path picker can never drift apart.
export const entryIconColor = ({
  isDir,
  extension,
  tags,
  extensions,
  colorfulFileTypes,
}: EntryIconColorArgs): string | undefined => {
  if (isDir) {
    // Uncoloured tags do not mask a later colour; reuse the same theme tokens as TagDots.
    const folderTag = tags.find(
      (tag) => tag.color !== TAG_COLOR.NONE && TAG_COLOR_CLASS[tag.color],
    );
    return folderTag
      ? `var(--color-tag-${TAG_COLOR_CLASS[folderTag.color]})`
      : undefined;
  }
  if (!colorfulFileTypes) return undefined;
  const category = categoryOf(extensions, extension);
  return category ? FILE_CATEGORY_COLORS[category] : undefined;
};
