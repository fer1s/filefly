import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";

import { faFolder } from "@fortawesome/free-solid-svg-icons";

import { getFileIcon } from "./fileIcon";

import type { EntryIconProps } from "./types";

// The entry's leading visual: a lazy-loaded thumbnail when available, else a folder glyph or a
// file-type glyph resolved from the extension (zip, audio, code, …).
const EntryIcon = ({
  isDir,
  extension,
  imgSrc,
  imgRef,
  finishLoad,
}: EntryIconProps) => (
  <div className={classNames("icon", isDir && "is_dir")}>
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
