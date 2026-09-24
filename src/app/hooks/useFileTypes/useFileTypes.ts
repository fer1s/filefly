import { useEffect } from "react";

import { setFileTypeExtensions } from "@/features/directory/formats";
import type { FileTypeExtensions } from "@/shared/constants";

// Mirror the user's extension → category map from settings into the formats store, which is what
// entry glyphs, thumbnails, the preview and the search filters read. Every window that renders
// entries or a preview calls this once with its own settings (the detached preview window loads
// settings itself), so a remap applies everywhere without prop-drilling the map.
export const useFileTypes = (extensions: FileTypeExtensions | undefined) => {
  useEffect(() => {
    setFileTypeExtensions(extensions);
  }, [extensions]);
};
