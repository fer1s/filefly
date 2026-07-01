// In-memory cache of computed recursive folder sizes (path -> bytes), shared across the session.
// The directory listing (useDirSizes) fills it as it walks folders; Properties / the info panel
// (useEntrySize) read it for an instant value instead of recomputing, then refresh in the
// background. Not persisted — folder sizes go stale as files change, so we always recompute and
// just use the cached value to avoid a "Calculating…" flash for something we already measured.
export const dirSizeCache = new Map<string, number>();
