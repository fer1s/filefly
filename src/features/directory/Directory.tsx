import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { useModal } from "@/shared/providers/ModalProvider";
import {
  VIEW_MODE,
  TRASH_DIR_NAME,
  RECENTS,
  DRAG_DROP_ACTION,
} from "@/shared/constants";
import {
  ENTRY_KIND,
  CLIPBOARD_MODE,
  IMAGE_FORMATS,
  MARKDOWN_FORMAT,
} from "@/features/directory/constants";
import {
  classNames,
  isTagsPath,
  basename,
  dirname,
  extension,
} from "@/shared/utils";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import { DirEntry } from "@/shared/models";

import { COLUMN_KEYS, buildListGrid } from "./columns";
import type { PendingDrop } from "./types";
import { useColumnVisibility } from "./hooks/useColumnVisibility";
import { useFolderView } from "./hooks/useFolderView";
import { useMarqueeSelection } from "./hooks/useMarqueeSelection";
import { useEntryDragMove } from "./hooks/useEntryDragMove";
import { useNativeDropTarget } from "./hooks/useNativeDropTarget";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { useClipboardShortcuts } from "./hooks/useClipboardShortcuts";
import { useZoomShortcuts } from "./hooks/useZoomShortcuts";
import { useContextMenu } from "./hooks/useContextMenu";
import { useWritability } from "./hooks/useWritability";
import { useDirectory } from "./providers/DirectoryProvider";

import ConfirmationDialog from "@/shared/components/patterns/ConfirmationDialog";
import Switcher from "@/shared/components/elements/Switcher";
import ListHeader from "./components/ListHeader";
import EntriesView from "./components/EntriesView";
import AccessDeniedNotice from "./components/AccessDeniedNotice";
import EntryContextMenu from "./components/EntryContextMenu";
import StatusBar from "./components/StatusBar";
import TypeaheadPopup from "./components/TypeaheadPopup";
import Preview from "./components/Preview";
import Properties from "./components/Properties";
import NtfsNotice from "./components/NtfsNotice";
import Spinner from "@/shared/components/elements/Spinner";

import "@/styles/views/Directory.css";

const Directory = () => {
  const {
    fs,
    path,
    setPath,
    view,
    search,
    accessDenied,
    zoom,
    savingSettings,
    dragDropAction,
    confirmDragDrop,
    toggleConfirmDragDrop,
    dragToExternalApps,
    previewImagesInApp,
    previewMarkdownInApp,
    infoPanelOpen,
  } = useStateContext();

  const [typeaheadQuery, setTypeaheadQuery] = useState("");

  // Warn when the current folder is on a read-only NTFS volume (no native write support on macOS).
  const { isNtfsReadOnly, recheck: recheckWritability } = useWritability();

  // Directory domain state (entries, selection, clipboard ops, preview/properties, inline
  // rename) lives in the provider so the QuickBar's quick actions share it.
  const {
    filtered,
    sorted,
    sort,
    handleSort,
    computingSizes,
    selectedIDs,
    setSelectedIDs,
    handleSelect,
    renamingID,
    setRenamingID,
    fileOps,
    preview,
    properties,
    searchActive,
    searching,
  } = useDirectory();

  // A modal dialog owns the keyboard while open. Keymap actions are already suppressed by the
  // dispatcher (MODAL scope), but the arrow / type-to-find nav is a raw listener, so gate it here.
  const { anyOpen: anyModalOpen } = useModal();

  // Rubber-band selection over the empty floor of the directory.
  const directoryRef = useRef<HTMLDivElement>(null);
  const { marquee, onMouseDown: onMarqueeMouseDown } = useMarqueeSelection({
    containerRef: directoryRef,
    setSelectedIDs,
  });

  // Drag entries onto a folder to move (default) or copy them there, per the drag-and-drop
  // settings. A pending drop is held until the user confirms, when confirmation is enabled.
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  // "Don't ask again" toggle inside the confirm dialog; on accept it turns off future confirms.
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const settingIsCopy = dragDropAction === DRAG_DROP_ACTION.COPY;

  const performDrop = useCallback(
    (sources: string[], dest: string, copy: boolean) =>
      copy ? fileOps.copyTo(sources, dest) : fileOps.moveTo(sources, dest),
    [fileOps],
  );

  // Files dropped on a folder / the current dir. Our own drag honours the move/copy setting;
  // files dragged in from another app always copy (never move them out of their origin).
  const handleDrop = useCallback(
    (sources: string[], dest: string, external = false) => {
      // Drop no-ops (an item already in dest, or a folder onto itself/a descendant) transfer
      // nothing — filter them out first so dropping in the current folder's empty space doesn't
      // pop the confirm dialog for a move/copy that would do nothing. transferTo re-checks this.
      const targets = sources.filter(
        (src) =>
          src &&
          dirname(src) !== dest &&
          dest !== src &&
          !dest.startsWith(`${src}/`),
      );
      if (!targets.length) return;
      const copy = external || settingIsCopy;
      if (confirmDragDrop) {
        setDontAskAgain(false);
        setPendingDrop({ sources: targets, dest, copy });
      } else performDrop(targets, dest, copy);
    },
    [confirmDragDrop, performDrop, settingIsCopy],
  );

  // Start the native OS drag (files can be dropped into other apps and back into ours). `icon` is
  // the grabbed entry's cached thumbnail. We deliberately don't force a copy/move mode: pinning it
  // to "move" makes external apps (e.g. WhatsApp) reject the drop, so we let each target choose the
  // operation. The in-app move/copy is still decided by handleDrop per the drag-and-drop setting.
  const handleDragOut = useCallback(
    (sources: string[], icon?: string) => fs.startNativeDrag(sources, icon),
    [fs],
  );

  // Drag entries onto a folder row (the whole selection if the dragged entry is part of it).
  // Feedback is applied imperatively, so it never re-renders the rows.
  const { bindDrag, ghostRef } = useEntryDragMove({
    entries: sorted,
    selectedIDs,
    onDrop: handleDrop,
    allowExternalDrag: dragToExternalApps,
    onDragOut: handleDragOut,
  });

  // When a native OS drag is over the window (our own drag that left and came back, or files from
  // another app), highlight the folder under the cursor and drop into it — or, on empty space,
  // import into the current directory (only where that makes sense, not Volumes/Recents/Tags).
  const importDir = path && path !== RECENTS && !isTagsPath(path) ? path : "";
  useNativeDropTarget({
    entries: sorted,
    currentDir: importDir,
    onDropFiles: handleDrop,
  });

  useFolderView(path);

  const { visible: visibleColumns, toggle: toggleColumn } =
    useColumnVisibility(path);
  const hiddenColumns = COLUMN_KEYS.filter(
    (key) => !visibleColumns.includes(key),
  );

  const menu = useContextMenu();
  const isCurrentDirectory =
    menu.elementType === ENTRY_KIND.DIRECTORY && menu.elementID === path;

  // Suppress the per-entry metadata hover card when the directory isn't the focused surface: a
  // dialog is open, a context menu is open, the full-screen preview is up, or the info panel
  // already shows that metadata. (Losing app focus hides it too, handled inside Tooltip.)
  const metadataTooltipDisabled =
    anyModalOpen || menu.visible || preview.visible || infoPanelOpen;
  // Browsing the system Trash (~/.Trash): entries offer Restore instead of Move-to-Trash.
  const inTrash = path.endsWith(`/${TRASH_DIR_NAME}`);

  // Open a file: images/markdown go to the in-app preview when their setting is on, everything
  // else (and those when it's off) opens in the OS default app. Shared by Enter (below) and
  // double-click (DirEntry via onOpenFile) so both honour the setting.
  const openFile = useCallback(
    (entry: DirEntry) => {
      const ext = extension(entry.name);
      const inApp =
        (previewImagesInApp && IMAGE_FORMATS.includes(ext)) ||
        (previewMarkdownInApp && ext === MARKDOWN_FORMAT);
      if (inApp) preview.open(entry.path);
      else fs.open(entry.path);
    },
    [previewImagesInApp, previewMarkdownInApp, preview, fs],
  );

  const handleKeyboardOpen = useCallback(
    (entry: DirEntry) =>
      entry.metadata.isDir ? setPath(entry.path) : openFile(entry),
    [openFile, setPath],
  );

  const handleCancelRename = useCallback(
    () => setRenamingID(""),
    [setRenamingID],
  );

  // Create a folder in the current directory and start renaming it inline.
  const handleNewFolder = useCallback(async () => {
    try {
      const created = await fs.createFolder(path);
      setRenamingID(created);
    } catch (err) {
      notify(t.errors.createFolder(String(err)), TOAST_TYPE.ERROR);
    }
  }, [fs, path, setRenamingID]);

  // Open a terminal at the selection's folder (a folder → itself, a file → its parent), or the
  // current directory when the selection isn't a single entry. Skipped in the virtual views.
  const handleOpenInTerminal = useCallback(() => {
    if (path === "" || path === RECENTS || isTagsPath(path)) return;
    const id = selectedIDs.length === 1 ? selectedIDs[0] : path;
    const entry = sorted.find((item) => item.path === id);
    const dir = entry?.metadata.isFile
      ? id.split("/").slice(0, -1).join("/")
      : id;
    fs.openInTerminal(dir);
  }, [fs, path, selectedIDs, sorted]);

  // Entries on the clipboard in cut mode are dimmed until the cut is pasted or cleared.
  const cutPaths = useMemo(
    () =>
      new Set(
        fileOps.clipboard?.mode === CLIPBOARD_MODE.CUT
          ? fileOps.clipboard.paths
          : [],
      ),
    [fileOps.clipboard],
  );

  // Show Properties for the single selected entry, or the current folder otherwise.
  const handleProperties = useCallback(() => {
    if (selectedIDs.length === 1) properties.open(selectedIDs[0], false);
    else if (path !== "" && path !== RECENTS && !isTagsPath(path))
      properties.open(path, true);
  }, [selectedIDs, path, properties]);

  useKeyboardNav({
    items: sorted,
    view,
    // Stand down while an overlay owns the keyboard: a modal dialog, or the context menu (whose
    // own arrow keys roam its items — see ContextMenu). Otherwise the raw arrow listener would
    // move the directory selection behind the menu at the same time.
    enabled:
      !preview.visible && !properties.visible && !anyModalOpen && !menu.visible,
    selectedIDs,
    setSelectedIDs,
    onOpen: handleKeyboardOpen,
    onTypeaheadChange: setTypeaheadQuery,
  });

  useClipboardShortcuts({
    // Disabled while the Properties popup is open so Cmd/Ctrl+C copies the selected text
    // instead of triggering the file-copy shortcut.
    enabled: !preview.visible && !properties.visible,
    selectedIDs,
    onCopy: fileOps.copy,
    onCut: fileOps.cut,
    onPaste: fileOps.paste,
    onUndo: fileOps.undo,
    onRedo: fileOps.redo,
    onDelete: fileOps.remove,
    onDeletePermanently: fileOps.removePermanently,
    // Rename only makes sense for a single entry.
    onRename: (ids) => {
      if (ids.length === 1) setRenamingID(ids[0]);
    },
    onNewFolder: handleNewFolder,
    onSelectAll: () => setSelectedIDs(sorted.map((entry) => entry.path)),
    onOpenInTerminal: handleOpenInTerminal,
    onProperties: handleProperties,
  });

  useZoomShortcuts(!preview.visible && !properties.visible);

  // The empty floor of the entries area represents the directory currently being viewed.
  // Restrict the menu to that area: not the list header, the status bar, or an entry row.
  const handleEmptyContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".directory_content")) return;
    if (target.closest(".list_header")) return;
    if (target.closest(".dir_entry_item")) return;
    e.preventDefault();
    setSelectedIDs([]);
    menu.openAt(e.clientX, e.clientY, path, ENTRY_KIND.DIRECTORY);
  };

  return (
    <div
      className="directory_page"
      ref={directoryRef}
      onMouseDown={onMarqueeMouseDown}
      onClick={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest(".directory_content") && !el.closest(".dir_entry_item"))
          setSelectedIDs([]);
      }}
      onContextMenu={handleEmptyContextMenu}
    >
      {marquee && (
        <div
          className="marquee_box"
          style={{
            left: marquee.left,
            top: marquee.top,
            width: marquee.width,
            height: marquee.height,
          }}
        />
      )}

      <div
        className={classNames(
          "directory_content",
          ...hiddenColumns.map((key) => `hide_col_${key}`),
        )}
        style={
          {
            "--list-grid": buildListGrid(visibleColumns),
            "--zoom": zoom,
          } as CSSProperties
        }
      >
        {accessDenied && <AccessDeniedNotice />}

        {!accessDenied && isNtfsReadOnly && (
          <NtfsNotice recheck={recheckWritability} />
        )}

        {!accessDenied &&
          !searchActive &&
          view === VIEW_MODE.LIST &&
          sorted.length > 0 && (
            <ListHeader
              key="list-header"
              sort={sort}
              onSort={handleSort}
              visibleColumns={visibleColumns}
              onToggleColumn={toggleColumn}
            />
          )}

        {/* Searching with nothing to show yet: a spinner stands in for the (hidden) directory. */}
        {!accessDenied && searching && sorted.length === 0 && (
          <div className="search_loading">
            <Spinner />
          </div>
        )}

        {!accessDenied && !(searching && sorted.length === 0) && (
          <EntriesView
            key={searchActive ? "search" : path}
            entries={sorted}
            view={view}
            selectedIDs={selectedIDs}
            cutPaths={cutPaths}
            renamingID={renamingID}
            contextMenuRef={menu.ref}
            onSelect={handleSelect}
            onOpenFile={openFile}
            onRename={fileOps.rename}
            onCancelRename={handleCancelRename}
            menu={{
              setVisible: menu.setVisible,
              setId: menu.setElementID,
              setType: menu.setElementType,
            }}
            bindDrag={bindDrag}
            metadataTooltipDisabled={metadataTooltipDisabled}
          />
        )}

        {!accessDenied && searchActive && !searching && sorted.length === 0 && (
          <p className="no_results">{t.directory.noResults(search)}</p>
        )}
      </div>

      <StatusBar
        total={filtered.length}
        selected={selectedIDs.length}
        search={searchActive ? search : ""}
        searchLoading={searching}
        computingSizes={computingSizes}
        savingSettings={savingSettings}
        progress={fileOps.progress}
      />

      <EntryContextMenu
        contextMenuRef={menu.ref}
        visible={menu.visible}
        onClose={() => menu.setVisible(false)}
        elementId={menu.elementID}
        elementType={menu.elementType}
        isCurrentDirectory={isCurrentDirectory}
        inTrash={inTrash}
        selectedIDs={selectedIDs}
        canPaste={!!fileOps.clipboard}
        fileOps={fileOps}
        onStartRename={setRenamingID}
        onPreview={preview.open}
        onProperties={properties.open}
      />

      <TypeaheadPopup query={typeaheadQuery} />

      <Preview
        fileType={preview.fileType}
        filePath={preview.filePath}
        previewVisible={preview.visible}
        setPreviewVisible={preview.setVisible}
        onPrev={preview.prev}
        onNext={preview.next}
        hasPrev={preview.hasPrev}
        hasNext={preview.hasNext}
        onDelete={() => fileOps.remove([preview.filePath])}
      />

      <Properties
        entry={properties.entry}
        visible={properties.visible}
        onClose={properties.close}
      />

      {/* Confirm a drag-and-drop move/copy before it runs (when confirmation is enabled). */}
      <ConfirmationDialog
        visible={!!pendingDrop}
        title={pendingDrop?.copy ? t.common.copy : t.common.move}
        message={
          pendingDrop
            ? (pendingDrop.copy
                ? t.directory.confirmDragCopy
                : t.directory.confirmDragMove)(
                pendingDrop.sources.length === 1
                  ? basename(pendingDrop.sources[0])
                  : t.directory.itemCount(pendingDrop.sources.length),
                basename(pendingDrop.dest),
              )
            : ""
        }
        confirmLabel={pendingDrop?.copy ? t.common.copy : t.common.move}
        extra={
          <label className="confirmation_toggle">
            <Switcher
              checked={dontAskAgain}
              onChange={() => setDontAskAgain((prev) => !prev)}
            />
            <span>{t.common.dontAskAgain}</span>
          </label>
        }
        onConfirm={() => {
          if (pendingDrop)
            performDrop(
              pendingDrop.sources,
              pendingDrop.dest,
              pendingDrop.copy,
            );
          // Persist the preference: stop confirming future drops.
          if (dontAskAgain && confirmDragDrop) toggleConfirmDragDrop();
          setPendingDrop(null);
        }}
        onClose={() => setPendingDrop(null)}
      />

      {/* Follows the pointer during a drag-to-move; shows the dragged entry + a count badge.
          Toggled visible via body.is-entry-dragging; positioned imperatively by the hook. */}
      <div ref={ghostRef} className="drag_ghost" aria-hidden="true" />
    </div>
  );
};

export default Directory;
