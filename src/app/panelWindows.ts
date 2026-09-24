import { lazy } from "react";

// Detached panel surfaces (`?panel=preview|properties`). Lazy: a browser window never renders
// them, so their chunks — the whole Preview stack included — stay out of the main-window startup
// bundle. Kept out of main.tsx so that file only exports nothing (react-refresh rule).
export const PreviewWindow = lazy(
  () => import("@/features/directory/components/Preview/PreviewWindow"),
);
export const PropertiesWindow = lazy(
  () => import("@/features/directory/components/Properties/PropertiesWindow"),
);
