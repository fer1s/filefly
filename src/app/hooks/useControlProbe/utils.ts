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

// Snapshot of the file-preview overlay for headless debugging of the markdown preview/editor and
// its in-app find. Reports mode, scroll offsets, the find query/count, and — the useful bit for
// "does find scroll to the hit" — every match mark's rect plus whether it sits inside the
// scrollable content viewport (so `activeInView` tells you if the active hit is actually revealed).
// Returns `{ open: false }` when no preview is mounted/visible.
export const previewSnapshot = () => {
  const container = document.querySelector<HTMLElement>(".preview_container");
  if (!container || !container.classList.contains("visible"))
    return { open: false };

  const content = document.querySelector<HTMLElement>(".preview_content");
  const editor =
    document.querySelector<HTMLTextAreaElement>(".preview_md_editor");
  const findBar = document.querySelector<HTMLElement>(".preview_find");
  const findInput = findBar?.querySelector<HTMLInputElement>(
    ".preview_find_input",
  );
  const findCount = findBar?.querySelector<HTMLElement>(".preview_find_count");
  const contentRect = content?.getBoundingClientRect() ?? null;

  const marks = Array.from(
    document.querySelectorAll<HTMLElement>("mark.preview_find_hit"),
  ).map((m, i) => {
    const r = m.getBoundingClientRect();
    return {
      i,
      text: m.textContent,
      active: m.classList.contains("active"),
      rect: rectOf(m),
      // Fully within the content's scroll viewport (top & bottom both visible).
      inView:
        !!contentRect &&
        r.top >= contentRect.top &&
        r.bottom <= contentRect.bottom,
    };
  });
  const activeIndex = marks.findIndex((m) => m.active);

  return {
    open: true,
    mode: editor ? "edit" : "preview",
    // Floating-panel geometry: viewport rect + whether it's in the maximized (viewport-filling)
    // layout — for debugging drag/resize/maximize.
    maximized: container.classList.contains("maximized"),
    panelRect: rectOf(container),
    scroll: content
      ? {
          top: content.scrollTop,
          scrollHeight: content.scrollHeight,
          clientHeight: content.clientHeight,
        }
      : null,
    find: findBar
      ? {
          query: findInput?.value ?? "",
          count: findCount?.textContent ?? "",
          matchCount: marks.length,
          activeIndex,
          activeInView: activeIndex >= 0 ? marks[activeIndex].inView : null,
        }
      : null,
    editor: editor
      ? {
          selectionStart: editor.selectionStart,
          selectionEnd: editor.selectionEnd,
          scrollTop: editor.scrollTop,
          scrollHeight: editor.scrollHeight,
          clientHeight: editor.clientHeight,
          valueLength: editor.value.length,
        }
      : null,
    marks,
  };
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
