import { DIR_KIND } from "./constants";

// Whether an entry tile is a folder, per its data-kind marker (see DirEntry).
export const isDirEl = (el: HTMLElement): boolean =>
  el.getAttribute("data-kind") === DIR_KIND;

// A plain, JSON-serialisable snapshot of an element's viewport rect (for the probe payload).
export const rectOf = (el: HTMLElement) => {
  const b = el.getBoundingClientRect();
  return {
    left: b.left,
    top: b.top,
    right: b.right,
    bottom: b.bottom,
    width: b.width,
    height: b.height,
  };
};
