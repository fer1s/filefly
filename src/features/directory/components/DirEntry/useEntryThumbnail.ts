import { useEffect, useRef, useState, type RefObject } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { FileSystemManager } from "@/shared/managers/FileSystemManager";

import {
  imagePreviewLoad,
  acquireImageSlot,
} from "../../hooks/useImagePreviewLoading";
import { THUMBNAIL_SIZE, THUMBNAIL_PREFETCH_MARGIN } from "./constants";

// Lazy + throttled image/video/PDF thumbnail for one entry. A row only "wants" its thumbnail
// once it scrolls near the viewport (IntersectionObserver on `itemRef`); it then queues for a
// load slot so only a few decode at a time, and asks the backend for a small cached thumbnail
// (decoded/resized off the UI thread) — never the multi-megabyte original.
//
// Returns the loaded src (null until ready), the <img> ref to attach, and `finishLoad` to wire
// to the image's onLoad/onError so the slot frees and the status-bar spinner count settles.
export const useEntryThumbnail = (
  path: string,
  fs: FileSystemManager,
  enabled: boolean,
  itemRef: RefObject<HTMLDivElement | null>,
  // When set, the file is drawn straight from disk (e.g. SVG, which the webview rasterises
  // natively) instead of asking the backend for a cached raster thumbnail.
  direct = false,
) => {
  const [wanted, setWanted] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loadEndedRef = useRef(false);
  const releaseSlotRef = useRef<(() => void) | null>(null);

  // Settle one load: free the slot (so the next queued thumbnail starts) and drop the StatusBar
  // spinner count. Idempotent per load.
  const finishLoad = () => {
    if (loadEndedRef.current) return;
    loadEndedRef.current = true;
    releaseSlotRef.current?.();
    releaseSlotRef.current = null;
    imagePreviewLoad.end();
  };

  useEffect(() => {
    if (!enabled) return;
    const el = itemRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setWanted(true);
          io.disconnect();
        }
      },
      { rootMargin: THUMBNAIL_PREFETCH_MARGIN },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [enabled, itemRef]);

  useEffect(() => {
    if (!wanted) return;
    loadEndedRef.current = false;
    imagePreviewLoad.start();
    releaseSlotRef.current = acquireImageSlot(() => {
      if (direct) {
        setImgSrc(convertFileSrc(path));
        return;
      }
      fs.getThumbnail(path, THUMBNAIL_SIZE)
        .then((thumb) => setImgSrc(convertFileSrc(thumb)))
        .catch(() => finishLoad());
    });

    return () => {
      releaseSlotRef.current?.();
      releaseSlotRef.current = null;
      if (!loadEndedRef.current) {
        loadEndedRef.current = true;
        imagePreviewLoad.end();
      }
    };
  }, [wanted, path, fs, direct]);

  // Cached images can already be complete before onLoad fires — settle now so the slot frees
  // and the spinner count doesn't get stuck.
  useEffect(() => {
    if (imgSrc && imgRef.current?.complete) finishLoad();
  }, [imgSrc]);

  return { imgSrc, imgRef, finishLoad };
};
