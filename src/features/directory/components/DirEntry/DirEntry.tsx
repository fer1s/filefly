import { memo, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import {
  classNames,
  navigateToPath,
  formatBytes,
  formatDate,
} from "@/shared/utils";
import { ENTRY_KIND, IMAGE_FORMATS, KEY } from "@/shared/constants";
import Icon from "@/shared/components/elements/Icon";
import Tooltip from "@/shared/components/elements/Tooltip";
import {
  imagePreviewLoad,
  acquireImageSlot,
} from "../../hooks/useImagePreviewLoading";
import { t } from "@/lang";

import { faFile, faFolder } from "@fortawesome/free-solid-svg-icons";

import type { DirEntryItemProps } from "./types";

// Max thumbnail edge in px. Sized for a retina grid icon; the backend caches at this size.
const THUMBNAIL_SIZE = 160;

// Hover dwell before the metadata tooltip appears, in ms — long enough not to flash while
// the pointer sweeps across the grid.
const METADATA_TOOLTIP_DELAY = 600;

const DirEntryItemComponent = ({
  entry,
  fs,
  setPath,
  contextMenuRef,
  id,

  selected,
  onSelect,

  renaming,
  onRename,
  onCancelRename,

  setContextMenuVisible,
  setContextMenuElementID,
  setContextMenuElementType,
}: DirEntryItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);

  // handle context menu
  useEffect(() => {
    const item = itemRef.current;
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      if (itemRef.current && contextMenuRef.current) {
        if (!itemRef.current.contains(e.target as Node))
          return setContextMenuVisible(false);

        setContextMenuElementID(itemRef.current.id);

        if (entry.metadata.isDir)
          setContextMenuElementType(ENTRY_KIND.DIRECTORY);
        else if (entry.metadata.isFile)
          setContextMenuElementType(ENTRY_KIND.FILE);
        else setContextMenuElementType(ENTRY_KIND.NONE);

        contextMenuRef.current.style.left = `${e.clientX}px`;
        contextMenuRef.current.style.top = `${e.clientY}px`;

        setContextMenuVisible(true);
      }
    };

    // Attach the event listener to the individual item
    item?.addEventListener("contextmenu", handleContextMenu);
    // Remove the event listener from the individual item
    return () => item?.removeEventListener("contextmenu", handleContextMenu);
  }, [
    contextMenuRef,
    entry.metadata.isDir,
    entry.metadata.isFile,
    setContextMenuElementID,
    setContextMenuElementType,
    setContextMenuVisible,
  ]);

  // Move keyboard focus to the entry when it becomes the selected one.
  useEffect(() => {
    if (selected) itemRef.current?.focus();
  }, [selected]);

  // Inline rename: focus the input and preselect the base name (without extension) when editing starts.
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameDoneRef = useRef(false);

  useEffect(() => {
    if (!renaming || !renameInputRef.current) return;
    renameDoneRef.current = false;
    const el = renameInputRef.current;
    el.focus();
    const dot = entry.name.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : entry.name.length);
  }, [entry.name, renaming]);

  const submitRename = () => {
    if (renameDoneRef.current) return;
    renameDoneRef.current = true;
    const value = renameInputRef.current?.value.trim();
    if (value && value !== entry.name) onRename(entry.path, value);
    else onCancelRename();
  };

  const cancelRename = () => {
    if (renameDoneRef.current) return;
    renameDoneRef.current = true;
    onCancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === KEY.ENTER) submitRename();
    else if (e.key === KEY.ESCAPE) cancelRename();
  };

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

  // Split extension from the file name
  const name = entry.metadata.isFile ? entry.name.split(".")[0] : entry.name;
  const extension = entry.metadata.isFile
    ? entry.name.split(".")[entry.name.split(".").length - 1]
    : "";

  const isImage =
    entry.metadata.isFile &&
    IMAGE_FORMATS.includes(extension.toLowerCase().trim());

  // Dotfiles are hidden on macOS/Unix; dim them to set them apart (Finder-style).
  const isHidden = entry.name.startsWith(".");

  // Lazy + throttled image thumbnails. A row only "wants" its thumbnail once it
  // scrolls near the viewport (IntersectionObserver); it then queues for a load
  // slot so only a few decode at a time. This keeps opening a screenshot-heavy
  // folder from janking the main thread.
  const [wanted, setWanted] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loadEndedRef = useRef(false);
  const releaseSlotRef = useRef<(() => void) | null>(null);

  // Settle one load: free the slot (so the next queued thumbnail starts) and
  // drop the StatusBar spinner count. Idempotent per load.
  const finishLoad = () => {
    if (loadEndedRef.current) return;
    loadEndedRef.current = true;
    releaseSlotRef.current?.();
    releaseSlotRef.current = null;
    imagePreviewLoad.end();
  };

  useEffect(() => {
    if (!isImage) return;
    const el = itemRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setWanted(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [isImage]);

  // Once wanted, count it as loading and queue for a slot; when granted, ask the backend
  // for a small cached thumbnail (decoded/resized off the UI thread) and load that — never
  // the multi-megabyte original.
  useEffect(() => {
    if (!wanted) return;
    loadEndedRef.current = false;
    imagePreviewLoad.start();
    releaseSlotRef.current = acquireImageSlot(() => {
      fs.getThumbnail(entry.path, THUMBNAIL_SIZE)
        .then((thumb) => setImgSrc(convertFileSrc(thumb)))
        .catch(() => finishLoad());
    });

    return () => {
      releaseSlotRef.current?.();
      releaseSlotRef.current = null;
      if (!loadEndedRef.current) {
        loadEndedRef.current = true;
        imagePreviewLoad.end();
      }
    };
  }, [wanted, entry.path, fs]);

  // Cached images can already be complete before onLoad fires — settle now so
  // the slot frees and the spinner count doesn't get stuck.
  useEffect(() => {
    if (imgSrc && imgRef.current?.complete) finishLoad();
  }, [imgSrc]);

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
        tabIndex={0}
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
            {isImage && imgSrc ? (
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
