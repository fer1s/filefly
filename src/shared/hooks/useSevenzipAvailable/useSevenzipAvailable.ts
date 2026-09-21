import { useEffect, useState } from "react";

import { sevenzipAvailable } from "@/shared/services/api";

// Whether a 7-Zip binary is on PATH. Probed once and cached module-wide (it can't change during a
// session), so every consumer (compress submenu, …) shares the single result. Starts false until the
// first probe resolves, so the 7z option only appears once we know it works.
let cached: boolean | null = null;

export const useSevenzipAvailable = (): boolean => {
  const [available, setAvailable] = useState(cached ?? false);

  useEffect(() => {
    if (cached !== null) return;
    let alive = true;
    sevenzipAvailable().then((value) => {
      cached = value;
      if (alive) setAvailable(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  return available;
};
