import { useCallback, useMemo, useRef, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import Icon from "@/shared/components/elements/Icon";
import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import Popup from "@/shared/components/patterns/Popup";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import { ask } from "@tauri-apps/plugin-dialog";
import {
  ACCEPTED_PREVIEW_FORMATS,
  CLIPBOARD_MODE,
  ENTRY_KIND,
  type ClipboardMode,
  type EntryKind,
} from "@/shared/constants";
import { DirEntryItem } from "./components/DirEntry";
import { useSelection } from "./hooks/useSelection";
import { useMarqueeSelection } from "./hooks/useMarqueeSelection";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { useClipboardShortcuts } from "./hooks/useClipboardShortcuts";
import { useContextMenu } from "./hooks/useContextMenu";

import {
  faArrowUpRightFromSquare,
  faCircleInfo,
  faCopy,
  faEye,
  faFilePen,
  faPaste,
  faScissors,
  faTerminal,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/views/Directory.css";
import Preview from "./components/Preview";
import Properties from "./components/Properties";
import StatusBar from "./components/StatusBar";
import TypeaheadPopup from "./components/TypeaheadPopup";
import { DirEntry } from "@/shared/models";

const Directory = () => {
  const { fs, dirContent, path, setPath, view, search, refreshDir } =
    useStateContext();

  // Internal clipboard for copy/cut, pasted via the empty-area context menu.
  const [clipboard, setClipboard] = useState<{
    paths: string[];
    mode: ClipboardMode;
  } | null>(null);

  // Path of the entry currently being renamed inline (empty when none).
  const [renamingID, setRenamingID] = useState("");

  // Properties modal.
  const [propertiesEntry, setPropertiesEntry] = useState<DirEntry | null>(null);
  const [propertiesVisible, setPropertiesVisible] = useState(false);
  const [typeaheadQuery, setTypeaheadQuery] = useState("");

  // Entries visible after applying the sidebar search filter.
  const filtered = useMemo(
    () =>
      search
        ? dirContent.filter((e) =>
            e.name.toLowerCase().includes(search.toLowerCase()),
          )
        : dirContent,
    [dirContent, search],
  );

  const { selectedIDs, setSelectedIDs, handleSelect } = useSelection();

  // Rubber-band selection over the empty floor of the directory.
  const directoryRef = useRef<HTMLDivElement>(null);
  const { marquee, onMouseDown: onMarqueeMouseDown } = useMarqueeSelection({
    containerRef: directoryRef,
    setSelectedIDs,
  });

  const [detailsPopupVisible, setDetailsPopupVisible] =
    useState<boolean>(false);
  const [highlitedElementID, setHighlitedElementID] = useState("");
  const [highlitedElementType, setHighlitedElementType] = useState<EntryKind>(
    ENTRY_KIND.NONE,
  );

  const {
    ref: contextMenuRef,
    visible: contextMenuVisible,
    setVisible: setContextMenuVisible,
    elementID: contextMenuElementID,
    setElementID: setContextMenuElementID,
    elementType: contextMenuElementType,
    setElementType: setContextMenuElementType,
    openAt: openContextMenuAt,
  } = useContextMenu();
  const isCurrentDirectoryContext =
    contextMenuElementType === ENTRY_KIND.DIRECTORY &&
    contextMenuElementID === path;

  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  // Files in the current (filtered) view that can be previewed, used for prev/next navigation.
  const previewables = useMemo(
    () =>
      filtered.filter(
        (e) =>
          e.metadata.isFile &&
          ACCEPTED_PREVIEW_FORMATS.includes(
            (e.name.split(".").pop() || "").toLowerCase(),
          ),
      ),
    [filtered],
  );

  const previewEntry =
    previewIndex >= 0 ? previewables[previewIndex] : undefined;
  const previewFilePath = previewEntry?.path ?? "";
  const previewFileType = previewEntry
    ? (previewEntry.name.split(".").pop() || "").toLowerCase()
    : "";

  const previewPrev = useCallback(
    () => setPreviewIndex((i) => (i > 0 ? i - 1 : i)),
    [],
  );
  const previewNext = useCallback(
    () => setPreviewIndex((i) => (i < previewables.length - 1 ? i + 1 : i)),
    [previewables.length],
  );

  const handleKeyboardOpen = useCallback(
    (entry: DirEntry) =>
      entry.metadata.isDir ? setPath(entry.path) : fs.open(entry.path),
    [fs, setPath],
  );

  useKeyboardNav({
    items: filtered,
    view,
    enabled: !previewVisible && !propertiesVisible,
    setSelectedIDs,
    onOpen: handleKeyboardOpen,
    onTypeaheadChange: setTypeaheadQuery,
  });

  const handleOpenInTerminal = () => {
    if (contextMenuElementType === ENTRY_KIND.DIRECTORY)
      fs.openInTerminal(contextMenuElementID);
    else if (contextMenuElementType === ENTRY_KIND.FILE)
      fs.openInTerminal(contextMenuElementID.split("/").slice(0, -1).join("/"));
    else
      console.error(
        'An error occured while handling the Open_In_Terminal event, See the defenition of the function "handleOpenInTerminal()" for more information in Directory.tsx',
      );

    setContextMenuVisible(false);
  };

  const handleOpenFile = () => {
    if (contextMenuElementType === ENTRY_KIND.FILE)
      fs.open(contextMenuElementID);
    else if (contextMenuElementType === ENTRY_KIND.DIRECTORY)
      setPath(contextMenuElementID);
    else
      console.error(
        'An error occured while handling the Open_File event, See the defenition of the function "handleOpenFile()" for more information in Directory.tsx',
      );

    setContextMenuVisible(false);
  };

  const handlePreviewFile = () => {
    if (contextMenuElementType !== ENTRY_KIND.FILE && !contextMenuElementID)
      return;

    // Get the file extension
    const fileExtension = contextMenuElementID.split(".").pop();
    if (!fileExtension)
      return console.error(
        'An error occured while handling the Preview_File event, See the defenition of the function "handlePreviewFile()" for more information in Directory.tsx',
      );

    // Check if the file extension is accepted
    if (!ACCEPTED_PREVIEW_FORMATS.includes(fileExtension)) return;

    // Locate the file among the previewable entries so prev/next can navigate from here.
    const index = previewables.findIndex(
      (e) => e.path === contextMenuElementID,
    );
    if (index < 0) return;

    setPreviewIndex(index);
    setPreviewVisible(true);

    setContextMenuVisible(false);
  };

  // The entries a context-menu action applies to: the whole selection if the clicked item is part of it,
  // otherwise just the clicked item.
  const actionTargets = () =>
    selectedIDs.includes(contextMenuElementID)
      ? selectedIDs
      : [contextMenuElementID];

  // Core operations on a list of paths, shared by the context menu and the keyboard shortcuts.
  const copyTargets = (targets: string[]) => {
    if (targets.length && targets[0])
      setClipboard({ paths: targets, mode: CLIPBOARD_MODE.COPY });
  };

  const cutTargets = (targets: string[]) => {
    if (targets.length && targets[0])
      setClipboard({ paths: targets, mode: CLIPBOARD_MODE.CUT });
  };

  const deleteTargets = async (targets: string[]) => {
    if (!targets.length || !targets[0]) return;

    const label =
      targets.length === 1
        ? `"${targets[0].split("/").pop()}"`
        : t.directory.items(targets.length);
    const confirmed = await ask(t.directory.confirmDelete(label), {
      title: t.directory.deleteTitle,
      kind: "warning",
    });
    if (!confirmed) return;

    for (const target of targets) {
      try {
        await fs.trash(target);
      } catch (err) {
        notify(
          t.errors.delete(target.split("/").pop() || target, String(err)),
          TOAST_TYPE.ERROR,
        );
      }
    }

    setSelectedIDs([]);
    refreshDir();
  };

  const pasteIntoCurrent = async () => {
    if (!clipboard || path === "") return;

    for (const source of clipboard.paths) {
      try {
        if (clipboard.mode === CLIPBOARD_MODE.COPY) await fs.copy(source, path);
        else await fs.move(source, path);
      } catch (err) {
        notify(
          t.errors.paste(source.split("/").pop() || source, String(err)),
          TOAST_TYPE.ERROR,
        );
      }
    }

    if (clipboard.mode === CLIPBOARD_MODE.CUT) setClipboard(null);
    setSelectedIDs([]);
    refreshDir();
  };

  // Context-menu wrappers: act on the clicked item/selection, then close the menu.
  const handleCopy = () => {
    copyTargets(actionTargets());
    setContextMenuVisible(false);
  };

  const handleCut = () => {
    cutTargets(actionTargets());
    setContextMenuVisible(false);
  };

  const handleDelete = async () => {
    const targets = actionTargets();
    setContextMenuVisible(false);
    await deleteTargets(targets);
  };

  const handlePaste = async () => {
    setContextMenuVisible(false);
    await pasteIntoCurrent();
  };

  // Start inline rename on the clicked entry.
  const handleRename = () => {
    setRenamingID(contextMenuElementID);
    setContextMenuVisible(false);
  };

  const handleProperties = async () => {
    setContextMenuVisible(false);

    try {
      const entry = isCurrentDirectoryContext
        ? await fs.getEntry(contextMenuElementID)
        : dirContent.find((item) => item.path === contextMenuElementID);

      if (!entry) return;
      setPropertiesEntry(entry);
      setPropertiesVisible(true);
    } catch (error) {
      notify(t.errors.properties(String(error)), TOAST_TYPE.ERROR);
    }
  };

  const handleRenameSubmit = async (targetPath: string, newName: string) => {
    setRenamingID("");
    try {
      await fs.rename(targetPath, newName);
    } catch (err) {
      notify(t.errors.rename(String(err)), TOAST_TYPE.ERROR);
    }
    refreshDir();
  };

  useClipboardShortcuts({
    enabled: !previewVisible,
    selectedIDs,
    onCopy: copyTargets,
    onCut: cutTargets,
    onPaste: pasteIntoCurrent,
    onDelete: deleteTargets,
  });

  // Empty space represents the directory currently being viewed.
  const handleEmptyContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".dir_entry_item")) return;
    e.preventDefault();
    setSelectedIDs([]);
    openContextMenuAt(e.clientX, e.clientY, path, ENTRY_KIND.DIRECTORY);
  };

  // useEffect(() => {
  //    if(contextMenuVisible) {
  //       console.log(contextMenuElementID, contextMenuElementType)
  //    }
  // }, [contextMenuVisible, contextMenuElementID, contextMenuElementType])

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

      <div className="directory_content">
        <div className={view}>
          {filtered.map((entry) => (
            <DirEntryItem
              key={`${entry.name}#${entry.path}`}
              entry={entry}
              setPath={setPath}
              contextMenuRef={contextMenuRef}
              id={entry.path}
              view={view}
              selected={selectedIDs.includes(entry.path)}
              onSelect={(e) => handleSelect(entry.path, e)}
              renaming={renamingID === entry.path}
              onRename={(newName) => handleRenameSubmit(entry.path, newName)}
              onCancelRename={() => setRenamingID("")}
              setHighlitedElementID={setHighlitedElementID}
              setHighlitedElementType={setHighlitedElementType}
              setDetailsPopupVisible={setDetailsPopupVisible}
              setContextMenuVisible={setContextMenuVisible}
              setContextMenuElementID={setContextMenuElementID}
              setContextMenuElementType={setContextMenuElementType}
            />
          ))}
        </div>

        {search && filtered.length === 0 && (
          <p className="no_results">{t.directory.noResults(search)}</p>
        )}
      </div>

      <StatusBar total={filtered.length} selected={selectedIDs.length} />

      <ContextMenu contextMenuVisible={contextMenuVisible} ref={contextMenuRef}>
        {isCurrentDirectoryContext && (
          <>
            <ContextMenuItem
              text={t.contextMenu.paste}
              icon={<Icon icon={faPaste} />}
              onClick={clipboard ? handlePaste : undefined}
            />
            <ContextMenuItem isSeparator />
            <ContextMenuItem
              text={t.contextMenu.openInTerminal}
              icon={<Icon icon={faTerminal} />}
              onClick={handleOpenInTerminal}
            />
            <ContextMenuItem isSeparator />
            <ContextMenuItem
              text={t.contextMenu.properties}
              icon={<Icon icon={faCircleInfo} />}
              onClick={handleProperties}
            />
          </>
        )}

        {contextMenuElementType === ENTRY_KIND.DIRECTORY &&
          !isCurrentDirectoryContext && (
          <>
            <ContextMenuItem
              text={t.contextMenu.open}
              icon={<Icon icon={faArrowUpRightFromSquare} />}
              onClick={handleOpenFile}
            />
            <ContextMenuItem
              text={t.contextMenu.openInTerminal}
              icon={<Icon icon={faTerminal} />}
              onClick={handleOpenInTerminal}
            />
            <ContextMenuItem
              text={t.contextMenu.copy}
              icon={<Icon icon={faCopy} />}
              onClick={handleCopy}
            />
            <ContextMenuItem
              text={t.contextMenu.cut}
              icon={<Icon icon={faScissors} />}
              onClick={handleCut}
            />
            <ContextMenuItem
              text={t.contextMenu.rename}
              icon={<Icon icon={faFilePen} />}
              onClick={handleRename}
            />
            <ContextMenuItem
              text={t.contextMenu.delete}
              icon={<Icon icon={faTrash} />}
              onClick={handleDelete}
            />
          </>
        )}

        {contextMenuElementType === ENTRY_KIND.FILE && (
          <>
            <ContextMenuItem
              text={t.contextMenu.open}
              icon={<Icon icon={faArrowUpRightFromSquare} />}
              onClick={handleOpenFile}
            />
            {ACCEPTED_PREVIEW_FORMATS.includes(
              contextMenuElementID.split(".").pop() || "",
            ) && (
              <ContextMenuItem
                text={t.common.preview}
                icon={<Icon icon={faEye} />}
                onClick={handlePreviewFile}
              />
            )}
            <ContextMenuItem
              text={t.contextMenu.copy}
              icon={<Icon icon={faCopy} />}
              onClick={handleCopy}
            />
            <ContextMenuItem
              text={t.contextMenu.cut}
              icon={<Icon icon={faScissors} />}
              onClick={handleCut}
            />
            <ContextMenuItem
              text={t.contextMenu.rename}
              icon={<Icon icon={faFilePen} />}
              onClick={handleRename}
            />
            <ContextMenuItem
              text={t.contextMenu.delete}
              icon={<Icon icon={faTrash} />}
              onClick={handleDelete}
            />
          </>
        )}

        {(contextMenuElementType === ENTRY_KIND.DIRECTORY ||
          contextMenuElementType === ENTRY_KIND.FILE) &&
          !isCurrentDirectoryContext && (
          <>
            <ContextMenuItem isSeparator />
            <ContextMenuItem
              text={t.contextMenu.properties}
              icon={<Icon icon={faCircleInfo} />}
              onClick={handleProperties}
            />
          </>
        )}
      </ContextMenu>

      <Popup visible={detailsPopupVisible} title={t.details.title}>
        <h3>
          {t.details.type}{" "}
          <span>
            {highlitedElementType === ENTRY_KIND.DIRECTORY
              ? t.common.directory
              : highlitedElementType === ENTRY_KIND.FILE
                ? t.common.file
                : t.common.unknown}
          </span>
        </h3>
        <h3>
          {t.details.path}{" "}
          <span>
            {highlitedElementID.length > 40
              ? `${highlitedElementID.slice(0, 40)}...`
              : highlitedElementID || t.common.unknown}
          </span>
        </h3>
        {highlitedElementType === ENTRY_KIND.FILE && (
          <h3>
            {t.details.extension}{" "}
            <span>
              {highlitedElementID.split(".").pop() || t.common.unknown}
            </span>
          </h3>
        )}
      </Popup>

      <TypeaheadPopup query={typeaheadQuery} />

      <Preview
        fileType={previewFileType}
        filePath={previewFilePath}
        previewVisible={previewVisible}
        setPreviewVisible={setPreviewVisible}
        onPrev={previewPrev}
        onNext={previewNext}
        hasPrev={previewIndex > 0}
        hasNext={previewIndex < previewables.length - 1}
      />

      <Properties
        entry={propertiesEntry}
        visible={propertiesVisible}
        onClose={() => setPropertiesVisible(false)}
      />
    </div>
  );
};

export default Directory;
