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
  folderThumbnails,
}: EntryIconProps) => (
  <div
    className={classNames(
      "icon",
      isDir && "is_dir",
      folderThumbnails.length > 0 && "has_folder_thumbnails",
    )}
  >
    {isDir && folderThumbnails.length > 0 ? (
      <>
        <Icon icon={faFolder} />
        <span
          className="folder_thumbnails"
          data-count={folderThumbnails.length}
          aria-hidden="true"
        >
          {folderThumbnails.map((thumbnail) => (
            <img
              key={thumbnail.src}
              className={classNames(
                "folder_thumbnail",
                thumbnail.isSvg && "is_svg",
              )}
              src={thumbnail.src}
              decoding="async"
              draggable={false}
            />
          ))}
        </span>
      </>
    ) : imgSrc ? (
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
