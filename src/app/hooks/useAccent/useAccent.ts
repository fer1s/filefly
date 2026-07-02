import { useEffect } from "react";

import { ACCENT, type Accent } from "@/shared/constants";

// Applies the accent palette by reflecting the choice as data-accent="…" on <html>; theme.css maps
// that attribute to the --color-accent-rgb triple every accent token composes from (selection,
// focus, links). Independent of the light/dark theme (see useTheme) — the accent reads on both.
// Falls back to the default blue for an unknown/empty stored value.
export const useAccent = (accent: Accent) => {
  useEffect(() => {
    const known = (Object.values(ACCENT) as string[]).includes(accent);
    document.documentElement.dataset.accent = known ? accent : ACCENT.BLUE;
  }, [accent]);
};
