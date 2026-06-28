import { basename } from "@/shared/utils";

import { MAX_RECENT_PATHS } from "./constants";

export const getPathLabel = (path: string): string => basename(path);

export const getRecentPaths = (
  currentPath: string,
  visitedPaths: readonly string[],
): string[] => {
  const recentPaths: string[] = [];

  for (const path of [currentPath, ...[...visitedPaths].reverse()]) {
    if (path && !recentPaths.includes(path)) recentPaths.push(path);
    if (recentPaths.length === MAX_RECENT_PATHS) break;
  }

  return recentPaths;
};
