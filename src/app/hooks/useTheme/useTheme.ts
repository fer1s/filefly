import { useEffect } from "react";

import { THEME, type Theme } from "@/shared/constants";

// Applies the colour theme to the document. The DOM default (no attribute) is the dark palette in
// theme.css; this resolves "system" against the OS preference and reflects the choice as
// data-theme="light|dark" on <html>, re-resolving live while "system" is active. Dark could leave
// the attribute unset, but we set it explicitly so the current theme is always readable in the DOM.
export const useTheme = (theme: Theme) => {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");

    const apply = () => {
      const resolved =
        theme === THEME.SYSTEM
          ? media.matches
            ? THEME.LIGHT
            : THEME.DARK
          : theme;
      root.dataset.theme = resolved;
    };

    apply();

    if (theme !== THEME.SYSTEM) return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
};
