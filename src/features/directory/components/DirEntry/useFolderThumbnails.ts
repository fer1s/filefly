import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import {
  FOLDER_THUMBNAIL_COUNT,
  IMAGE_FORMATS,
  SVG_FORMAT,
} from "@/features/directory/constants";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { SFTP_SCHEME } from "@/shared/constants";

import {
  acquireImageSlot,
  imagePreviewLoad,
} from "../../hooks/useImagePreviewLoading";
import { THUMBNAIL_PREFETCH_MARGIN, THUMBNAIL_SIZE } from "./constants";
import type { FolderThumbnail } from "./types";
import { extensionOf } from "./utils";

// Resolve up to four direct image children for one folder. Discovery and thumbnail generation use
// the same viewport gate and concurrency queue as file thumbnails, so zoomed-out or off-screen
// folders do no work. The existing backend cache remains the single source of raster thumbnails.
export const useFolderThumbnails = (
  path: string,
  fs: FileSystemManager,
  enabled: boolean,
  itemRef: RefObject<HTMLDivElement | null>,
) => {
  const [wanted, setWanted] = useState(false);
  const [thumbnails, setThumbnails] = useState<FolderThumbnail[]>([]);
  const loadedRef = useRef(false);
  const loadEndedRef = useRef(true);
  const releaseSlotRef = useRef<(() => void) | null>(null);

  const endLoad = useCallback(() => {
    if (loadEndedRef.current) return;
    loadEndedRef.current = true;
    releaseSlotRef.current?.();
    releaseSlotRef.current = null;
    imagePreviewLoad.end();
  }, []);

  useEffect(() => {
    if (!enabled || wanted) return;
    const el = itemRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setWanted(true);
          observer.disconnect();
        }
      },
      { rootMargin: THUMBNAIL_PREFETCH_MARGIN },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, itemRef, wanted]);

  useEffect(() => {
    if (!enabled || !wanted || loadedRef.current) return;

    let cancelled = false;
    loadEndedRef.current = false;
    imagePreviewLoad.start();

    releaseSlotRef.current = acquireImageSlot(() => {
      void (async () => {
        try {
          const remote = path.startsWith(SFTP_SCHEME);
          const children = await fs.readDirectory(path);
          const imageChildren = children.filter((child) => {
            if (!child.metadata.isFile || child.name.startsWith("."))
              return false;
            const extension = extensionOf(child.name);
            return (
              IMAGE_FORMATS.includes(extension) &&
              !(remote && extension === SVG_FORMAT)
            );
          });

          const sources: FolderThumbnail[] = [];
          for (const child of imageChildren) {
            if (sources.length === FOLDER_THUMBNAIL_COUNT) break;
            const extension = extensionOf(child.name);
            try {
              const sourcePath =
                extension === SVG_FORMAT
                  ? child.path
                  : await fs.getThumbnail(child.path, THUMBNAIL_SIZE);
              sources.push({
                src: convertFileSrc(sourcePath),
                isSvg: extension === SVG_FORMAT,
              });
            } catch {
              // A corrupt or unsupported image does not prevent the remaining children from
              // filling the mosaic; an empty result simply falls back to the folder glyph.
            }
          }

          if (cancelled) return;
          loadedRef.current = true;
          if (sources.length === 0) {
            endLoad();
            return;
          }

          setThumbnails(sources);
          endLoad();
        } catch {
          if (!cancelled) endLoad();
        }
      })();
    });

    return () => {
      cancelled = true;
      endLoad();
    };
  }, [enabled, wanted, path, fs, endLoad]);

  return { thumbnails: enabled ? thumbnails : [] };
};
