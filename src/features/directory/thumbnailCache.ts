// Filesystem paths of already-generated entry thumbnails (the raster PNGs the backend caches on
// disk), keyed by entry path. Populated as rows load their thumbnails (useEntryThumbnail) and read
// synchronously to use a real thumbnail file as the native drag image — no rasterising, no CORS.
const cache = new Map<string, string>();

export const setThumbnailPath = (entryPath: string, thumbPath: string) => {
  cache.set(entryPath, thumbPath);
};

export const getThumbnailPath = (entryPath: string): string | undefined =>
  cache.get(entryPath);
