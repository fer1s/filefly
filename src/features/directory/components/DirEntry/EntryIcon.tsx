import type { RefObject } from "react";

import Icon from "@/shared/components/elements/Icon";

import { faFile, faFolder } from "@fortawesome/free-solid-svg-icons";

type EntryIconProps = {
  isDir: boolean;
  // A thumbnail (image/video/pdf preview) is available and loaded.
  imgSrc: string | null;
  imgRef: RefObject<HTMLImageElement | null>;
  // Fires on both load and error so the placeholder is cleared either way.
  finishLoad: () => void;
};

// The entry's leading visual: a lazy-loaded thumbnail when available, else a folder/file glyph.
const EntryIcon = ({ isDir, imgSrc, imgRef, finishLoad }: EntryIconProps) => (
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
      <Icon icon={isDir ? faFolder : faFile} />
    )}
  </div>
);

export { EntryIcon };
