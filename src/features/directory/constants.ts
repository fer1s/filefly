// Finder tag colour indices — the byte stored after the tag name in the xattr (`Name\nIndex`).
// 0 = no colour; 1..=7 are the standard Finder colours.
export const TAG_COLOR = {
  NONE: 0,
  GRAY: 1,
  GREEN: 2,
  PURPLE: 3,
  BLUE: 4,
  YELLOW: 5,
  RED: 6,
  ORANGE: 7,
} as const;

export type TagColor = (typeof TAG_COLOR)[keyof typeof TAG_COLOR];

// CSS modifier class per colour index (array position = the index), driving the --color-tag-*
// styling. Index 0 is the uncoloured (hollow) dot.
export const TAG_COLOR_CLASS = [
  "none",
  "gray",
  "green",
  "purple",
  "blue",
  "yellow",
  "red",
  "orange",
] as const;

// The seven selectable colours shown in the context-menu picker, in Finder's left→right order.
// `class` is the CSS modifier / i18n key; `index` is the stored colour byte.
export const TAG_PICKER_COLORS = [
  { index: TAG_COLOR.RED, class: "red" },
  { index: TAG_COLOR.ORANGE, class: "orange" },
  { index: TAG_COLOR.YELLOW, class: "yellow" },
  { index: TAG_COLOR.GREEN, class: "green" },
  { index: TAG_COLOR.BLUE, class: "blue" },
  { index: TAG_COLOR.PURPLE, class: "purple" },
  { index: TAG_COLOR.GRAY, class: "gray" },
] as const;
