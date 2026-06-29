// Feature flags for optional / experimental behavior. Flip a value to enable.
export const FEATURE_FLAGS = {
  // Recursively compute directory sizes for the list-view "Size" column. Each folder is
  // walked in the background; on large directories this is costly, so it's off by default.
  directorySizes: true,
} as const;
