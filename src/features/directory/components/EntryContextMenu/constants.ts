// How a tag covers the selection: every target has it, a subset (mixed), or none.
export const TAG_COVERAGE = {
  ALL: "all",
  SOME: "some",
  NONE: "none",
} as const;

export type TagCoverage = (typeof TAG_COVERAGE)[keyof typeof TAG_COVERAGE];
