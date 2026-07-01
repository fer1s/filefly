import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faFolder } from "@fortawesome/free-solid-svg-icons";
import { readTextFile } from "@tauri-apps/plugin-fs";

import { DirEntry } from "@/shared/models";
import { extension } from "@/shared/utils";

import { getFileIcon, FILE_ICONS } from "./components/DirEntry/fileIcon";
import { setThumbnailPath } from "./thumbnailCache";

// Native-drag previews for entries without a real thumbnail (folders, documents, …): the entry's
// FontAwesome glyph rasterised to a PNG data URL (the drag plugin accepts base64 images). Rendered
// once up front (prewarmDragGlyphs) and cached by glyph name, so a drag can look one up synchronously
// — client-side rasterisation is async, which would break the native drag's latch if done inline.

const GLYPH_PX = 128;
const cache = new Map<string, string>();

// Rasterise an SVG document (data: URL) to a PNG data URL, fit within GLYPH_PX preserving aspect.
const svgUrlToPng = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = GLYPH_PX;
      canvas.height = GLYPH_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no 2d context"));
      const nw = img.naturalWidth || GLYPH_PX;
      const nh = img.naturalHeight || GLYPH_PX;
      const scale = Math.min(GLYPH_PX / nw, GLYPH_PX / nh);
      const w = nw * scale;
      const h = nh * scale;
      ctx.drawImage(img, (GLYPH_PX - w) / 2, (GLYPH_PX - h) / 2, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });

// Rasterise an entry's SVG file to a bounded PNG and cache it as that entry's drag preview.
// (Passing the raw .svg path makes NSImage render it at its huge intrinsic size.) Best-effort:
// on failure the drag falls back to the image-file glyph.
export const cacheSvgDragPreview = async (path: string): Promise<void> => {
  try {
    const text = await readTextFile(path);
    const url = `data:image/svg+xml;base64,${btoa(
      unescape(encodeURIComponent(text)),
    )}`;
    setThumbnailPath(path, await svgUrlToPng(url));
  } catch (err) {
    console.error("Failed to render SVG drag preview:\n" + err);
  }
};

// Rasterise a FontAwesome glyph to a PNG data URL, coloured from the theme.
const glyphToPng = (icon: IconDefinition): Promise<string> => {
  const [width, height, , , pathData] = icon.icon;
  const d = Array.isArray(pathData) ? pathData.join(" ") : pathData;
  const color =
    getComputedStyle(document.body)
      .getPropertyValue("--color-text-secondary")
      .trim() || "#9aa0a6";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="${color}" d="${d}"/></svg>`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = GLYPH_PX;
      canvas.height = GLYPH_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no 2d context"));
      // Center the glyph (icons aren't square) within a square canvas.
      const scale = Math.min(GLYPH_PX / width, GLYPH_PX / height);
      const w = width * scale;
      const h = height * scale;
      ctx.drawImage(img, (GLYPH_PX - w) / 2, (GLYPH_PX - h) / 2, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
  });
};

// Render + cache every glyph a drag might need (folder + all file-type icons). Call once at startup.
export const prewarmDragGlyphs = async (): Promise<void> => {
  await Promise.all(
    [faFolder, ...FILE_ICONS].map(async (icon) => {
      if (cache.has(icon.iconName)) return;
      try {
        cache.set(icon.iconName, await glyphToPng(icon));
      } catch (err) {
        console.error("Failed to render drag glyph:\n" + err);
      }
    }),
  );
};

// The cached glyph PNG for an entry (folder or file-type), or undefined if not rendered yet.
export const glyphPngFor = (entry: DirEntry): string | undefined => {
  const icon = entry.metadata.isDir
    ? faFolder
    : getFileIcon(extension(entry.name));
  return cache.get(icon.iconName);
};
