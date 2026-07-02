import { memo, useEffect, useRef } from "react";

import {
  classNames,
  navigateToPath,
  formatBytes,
  formatDate,
} from "@/shared/utils";
import {
  IMAGE_FORMATS,
  VIDEO_FORMATS,
  PDF_FORMAT,
  MARKDOWN_FORMATS,
  SVG_FORMAT,
} from "@/features/directory/constants";
import Tooltip from "@/shared/components/elements/Tooltip";
import { t } from "@/lang";

import { METADATA_TOOLTIP_DELAY } from "./constants";
import { useEntryThumbnail } from "./useEntryThumbnail";
import { useInlineRename } from "./useInlineRename";
import { useEntryContextMenu } from "./useEntryContextMenu";
import { EntryMetadata } from "./EntryMetadata";
import { EntryIcon } from "./EntryIcon";
import { TagDots } from "./TagDots";
import type { DirEntryItemProps } from "./types";

const DirEntryItemComponent = ({
  entry,
  fs,
  setPath,
  tags,
  dateFormat,
  contextMenuRef,
  id,

  selected,
  cut,
  focused,
  tabbable,
  onSelect,
  onOpenFile,

  renaming,
  onRename,
  onCancelRename,

  setContextMenuVisible,
  setContextMenuElementID,
  setContextMenuElementType,

  bindDrag,
  metadataTooltipDisabled,
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

  // A freshly created folder starts in rename mode, possibly off-screen — scroll it into view.
  useEffect(() => {
    if (renaming) itemRef.current?.scrollIntoView({ block: "nearest" });
  }, [renaming]);

  // Split extension from the file name.
  const name = entry.metadata.isFile ? entry.name.split(".")[0] : entry.name;
  const extension = entry.metadata.isFile
    ? entry.name.split(".")[entry.name.split(".").length - 1]
    : "";

  const ext = extension.toLowerCase().trim();
  const isImage = entry.metadata.isFile && IMAGE_FORMATS.includes(ext);
  // Videos, PDFs and markdown get a thumbnail too (macOS QuickLook); same lazy/throttled path.
  const isVideo = entry.metadata.isFile && VIDEO_FORMATS.includes(ext);
  const isPdf = entry.metadata.isFile && ext === PDF_FORMAT;
  const isMarkdown = entry.metadata.isFile && MARKDOWN_FORMATS.includes(ext);
  // SVG draws straight from the file (no backend thumbnail) — the webview rasterises it natively.
  const isSvg = entry.metadata.isFile && ext === SVG_FORMAT;
  const isThumbnail = isImage || isVideo || isPdf || isMarkdown;

  // Dotfiles are hidden on macOS/Unix; dim them to set them apart (Finder-style).
  const isHidden = entry.name.startsWith(".");

  const { imgSrc, imgRef, finishLoad } = useEntryThumbnail(
    entry.path,
    fs,
    isThumbnail || isSvg,
    itemRef,
    isSvg,
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

  // Drag-to-move is disabled while renaming so dragging to select text in the input isn't hijacked.
  // One DOM for both views; .grid / .list on the container arranges it via CSS, so toggling
  // the view never rebuilds these subtrees (which is what made the switch laggy). The Tooltip
  // wrapper renders as `display: contents` so the entry keeps its slot in the flex layout.
  return (
    <Tooltip
      contents
      delay={METADATA_TOOLTIP_DELAY}
      showOnFocus={false}
      disabled={metadataTooltipDisabled}
      content={<EntryMetadata entry={entry} extension={extension} />}
    >
      <div
        className={classNames(
          "dir_entry_item",
          selected && "selected",
          cut && "cut",
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
            : onOpenFile(entry)
        }
        ref={itemRef}
        {...(renaming ? {} : bindDrag(entry.path))}
      >
        {/* Grid-only extension badge (hidden in list). */}
        {extension && name && <div className="extension">{extension}</div>}

        <div className="name">
          <EntryIcon
            isDir={entry.metadata.isDir}
            extension={ext}
            imgSrc={imgSrc}
            imgRef={imgRef}
            finishLoad={finishLoad}
          />
          <span className="entry_label">
            {renaming ? renameInput : <h3>{name || extension}</h3>}
            <TagDots tags={tags} />
          </span>
        </div>

        {/* List-only columns (hidden in grid). */}
        <div className="date_modified">
          <h3>
            {formatDate(entry.metadata.modified.secs_since_epoch, dateFormat)}
          </h3>
        </div>
        <div className="date_created">
          <h3>
            {formatDate(entry.metadata.created.secs_since_epoch, dateFormat)}
          </h3>
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
