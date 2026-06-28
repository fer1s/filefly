import { memo, useEffect, useRef } from "react";

import {
  classNames,
  navigateToPath,
  formatBytes,
  formatDate,
} from "@/shared/utils";
import { IMAGE_FORMATS, VIDEO_FORMATS, PDF_FORMAT } from "@/shared/constants";
import Icon from "@/shared/components/elements/Icon";
import Tooltip from "@/shared/components/elements/Tooltip";
import { t } from "@/lang";

import { faFile, faFolder } from "@fortawesome/free-solid-svg-icons";

import { METADATA_TOOLTIP_DELAY } from "./constants";
import { useEntryThumbnail } from "./useEntryThumbnail";
import { useInlineRename } from "./useInlineRename";
import { useEntryContextMenu } from "./useEntryContextMenu";
import type { DirEntryItemProps } from "./types";

const DirEntryItemComponent = ({
  entry,
  fs,
  setPath,
  contextMenuRef,
  id,

  selected,
  focused,
  tabbable,
  onSelect,

  renaming,
  onRename,
  onCancelRename,

  setContextMenuVisible,
  setContextMenuElementID,
  setContextMenuElementType,
}: DirEntryItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);

  useEntryContextMenu({
    itemRef,
    contextMenuRef,
    entry,
    selected,
    onSelect,
    setContextMenuElementID,
    setContextMenuElementType,
    setContextMenuVisible,
  });

  // Move keyboard focus to the entry only when it's the single focused one (keyboard nav),
  // never on bulk selection — focusing every item on Ctrl+A would scroll to the last one.
  useEffect(() => {
    if (focused) itemRef.current?.focus();
  }, [focused]);

  // Split extension from the file name.
  const name = entry.metadata.isFile ? entry.name.split(".")[0] : entry.name;
  const extension = entry.metadata.isFile
    ? entry.name.split(".")[entry.name.split(".").length - 1]
    : "";

  const ext = extension.toLowerCase().trim();
  const isImage = entry.metadata.isFile && IMAGE_FORMATS.includes(ext);
  // Videos and PDFs get a thumbnail too (macOS QuickLook); same lazy/throttled path.
  const isVideo = entry.metadata.isFile && VIDEO_FORMATS.includes(ext);
  const isPdf = entry.metadata.isFile && ext === PDF_FORMAT;
  const isThumbnail = isImage || isVideo || isPdf;

  // Dotfiles are hidden on macOS/Unix; dim them to set them apart (Finder-style).
  const isHidden = entry.name.startsWith(".");

  const { imgSrc, imgRef, finishLoad } = useEntryThumbnail(
    entry.path,
    fs,
    isThumbnail,
    itemRef,
  );

  const { renameInputRef, submitRename, handleRenameKeyDown } = useInlineRename(
    entry.name,
    entry.path,
    renaming,
    onRename,
    onCancelRename,
  );

  const renameInput = (
    <input
      ref={renameInputRef}
      className="rename_input"
      defaultValue={entry.name}
      onKeyDown={handleRenameKeyDown}
      onBlur={submitRename}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );

  // Hover card with the entry's metadata, shown via the shared Tooltip (Finder/Explorer-style).
  const metadataContent = (
    <div className="entry_metadata">
      <span className="entry_metadata_title">{t.details.title}</span>
      <div className="entry_metadata_rows">
        <span className="entry_metadata_key">{t.details.type}</span>
        <span className="entry_metadata_value">
          {entry.metadata.isDir ? t.common.directory : t.common.file}
        </span>
        <span className="entry_metadata_key">{t.details.path}</span>
        <span className="entry_metadata_value">{entry.path}</span>
        {entry.metadata.isFile && (
          <>
            <span className="entry_metadata_key">{t.details.extension}</span>
            <span className="entry_metadata_value">
              {extension || t.common.unknown}
            </span>
            <span className="entry_metadata_key">{t.details.size}</span>
            <span className="entry_metadata_value">
              {formatBytes(entry.size)}
            </span>
          </>
        )}
      </div>
    </div>
  );

  // One DOM for both views; .grid / .list on the container arranges it via CSS, so toggling
  // the view never rebuilds these subtrees (which is what made the switch laggy). The Tooltip
  // wrapper renders as `display: contents` so the entry keeps its slot in the flex layout.
  return (
    <Tooltip contents delay={METADATA_TOOLTIP_DELAY} content={metadataContent}>
      <div
        className={classNames(
          "dir_entry_item",
          selected && "selected",
          isHidden && "hidden",
        )}
        id={id}
        role="option"
        aria-selected={selected}
        aria-label={entry.name}
        tabIndex={tabbable ? 0 : -1}
        onClick={(e) => onSelect(entry.path, e)}
        onDoubleClick={() =>
          entry.metadata.isDir
            ? navigateToPath(entry, setPath)
            : fs.open(entry.path)
        }
        ref={itemRef}
      >
        {/* Grid-only extension badge (hidden in list). */}
        {extension && name && <div className="extension">{extension}</div>}

        <div className="name">
          <div className="icon">
            {isThumbnail && imgSrc ? (
              <img
                ref={imgRef}
                src={imgSrc}
                decoding="async"
                onLoad={finishLoad}
                onError={finishLoad}
              />
            ) : (
              <Icon icon={entry.metadata.isDir ? faFolder : faFile} />
            )}
          </div>
          {renaming ? renameInput : <h3>{name || extension}</h3>}
        </div>

        {/* List-only columns (hidden in grid). */}
        <div className="date_modified">
          <h3>{formatDate(entry.metadata.modified.secs_since_epoch)}</h3>
        </div>
        <div className="date_created">
          <h3>{formatDate(entry.metadata.created.secs_since_epoch)}</h3>
        </div>
        <div className="size">
          {entry.size > 0 && <h3>{formatBytes(entry.size)}</h3>}
        </div>
        <div className="kind">
          <h3>
            {entry.metadata.isDir
              ? t.common.directory
              : name && extension
                ? extension.toUpperCase()
                : t.common.file}
          </h3>
        </div>
      </div>
    </Tooltip>
  );
};

// Memoized so toggling the view (or one row changing) doesn't re-render every row.
// Relies on its props being stable (handlers are useCallback'd, `entry`/`fs` refs are kept)
// and on NOT subscribing to the app context — a context change re-renders consumers
// regardless of memo, so `fs` is passed in as a prop instead.
const DirEntryItem = memo(DirEntryItemComponent);

export { DirEntryItem };
