import { MAX_RECENT_PATHS } from "./constants";

export const getPathLabel = (path: string): string => {
  const normalizedPath = path.replace(/[\\/]+$/, "");
  const segments = normalizedPath.split(/[\\/]/);

  return segments[segments.length - 1] || path;
};

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
