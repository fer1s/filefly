import { useEffect, useState } from "react";

import type { FileSystemManager } from "@/shared/managers/FileSystemManager";

export const useHostName = (fs: FileSystemManager): string => {
  const [hostName, setHostName] = useState("");

  useEffect(() => {
    let cancelled = false;

    fs.getHostName()
      .then((name) => {
        if (!cancelled) setHostName(name ?? "");
      })
      .catch(() => {
        if (!cancelled) setHostName("");
      });

    return () => {
      cancelled = true;
    };
  }, [fs]);

  return hostName;
};
