import { useEffect, useState } from "react";

import { MAX_RECENT_PATHS } from "../../constants";

export const useRecentPaths = (path: string): string[] => {
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  useEffect(() => {
    if (!path) return;

    setRecentPaths((currentPaths) =>
      [
        path,
        ...currentPaths.filter((currentPath) => currentPath !== path),
      ].slice(0, MAX_RECENT_PATHS),
    );
  }, [path]);

  return recentPaths;
};
