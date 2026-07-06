import type { RefObject } from "react";

import Icon from "@/shared/components/elements/Icon";

import { faFolder } from "@fortawesome/free-solid-svg-icons";

import { getFileIcon } from "./fileIcon";

type EntryIconProps = {
  isDir: boolean;
  // File extension (lowercased or not) used to pick a type-specific glyph; "" for folders.
  extension: string;
  // A thumbnail (image/video/pdf preview) is available and loaded.
  imgSrc: string | null;
  imgRef: RefObject<HTMLImageElement | null>;
  // Fires on both load and error so the placeholder is cleared either way.
  finishLoad: () => void;
};

// The entry's leading visual: a lazy-loaded thumbnail when available, else a folder glyph or a
// file-type glyph resolved from the extension (zip, audio, code, …).
const EntryIcon = ({
  isDir,
  extension,
  imgSrc,
  imgRef,
  finishLoad,
}: EntryIconProps) => (
  <div className="icon">
    {imgSrc ? (
      <img
        ref={imgRef}
        src={imgSrc}
        decoding="async"
        onLoad={finishLoad}
        onError={finishLoad}
      />
    ) : (
      <Icon icon={isDir ? faFolder : getFileIcon(extension)} />
    )}
  </div>
);

export { EntryIcon };
