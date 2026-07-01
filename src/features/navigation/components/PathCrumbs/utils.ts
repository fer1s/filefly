import type { Crumb } from "./types";

// Split an absolute POSIX path into breadcrumbs: the root ("/") followed by one crumb per
// segment, each carrying the cumulative path to navigate to. "/" yields just the root crumb.
export const buildCrumbs = (path: string): Crumb[] => {
  const crumbs: Crumb[] = [{ label: "/", path: "/" }];

  const segments = path.replace(/\/+$/, "").split("/").filter(Boolean);
  let accumulated = "";
  for (const segment of segments) {
    accumulated += `/${segment}`;
    crumbs.push({ label: segment, path: accumulated });
  }

  return crumbs;
};
