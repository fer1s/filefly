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

// Snapshot of the sidebar's rows for the probe: pinned folders (path/label/rect) and volumes
// (path/rect, whether they show the inline eject button and where). `data-path` is set on each row
// (see FolderItem / VolumeItem).
export const sidebarSnapshot = () => {
  const folders = Array.from(
    document.querySelectorAll<HTMLElement>(".SideBar .folder_item"),
  ).map((el) => ({
    path: el.getAttribute("data-path"),
    label: el.getAttribute("aria-label"),
    rect: rectOf(el),
  }));
  const volumes = Array.from(
    document.querySelectorAll<HTMLElement>(".SideBar .drive_item"),
  ).map((el) => {
    const eject = el.querySelector<HTMLElement>(".drive_eject");
    return {
      path: el.getAttribute("data-path"),
      rect: rectOf(el),
      ejectable: !!eject,
      ejectRect: eject ? rectOf(eject) : null,
    };
  });
  return { folders, volumes };
};

// The path of the sidebar row (folder or volume) whose rect contains the CSS point, or null.
export const sidebarRowAt = (x: number, y: number): string | null => {
  const rows = document.querySelectorAll<HTMLElement>(
    ".SideBar .folder_item, .SideBar .drive_item",
  );
  for (const el of rows) {
    const b = el.getBoundingClientRect();
    if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom)
      return el.getAttribute("data-path");
  }
  return null;
};
