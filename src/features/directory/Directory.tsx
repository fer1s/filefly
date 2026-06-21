import { useCallback, useRef, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { ENTRY_KIND, VIEW_MODE } from "@/shared/constants";
import { t } from "@/lang";
import { DirEntry } from "@/shared/models";

import { useSelection } from "./hooks/useSelection";
import { useMarqueeSelection } from "./hooks/useMarqueeSelection";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { useClipboardShortcuts } from "./hooks/useClipboardShortcuts";
import { useContextMenu } from "./hooks/useContextMenu";
import { useDirectoryEntries } from "./hooks/useDirectoryEntries";
import { useFileOperations } from "./hooks/useFileOperations";
import { usePreview } from "./hooks/usePreview";
import { useProperties } from "./hooks/useProperties";
import { useDetailsPopup } from "./hooks/useDetailsPopup";

import ListHeader from "./components/ListHeader";
import EntriesView from "./components/EntriesView";
import EntryContextMenu from "./components/EntryContextMenu";
import DetailsPopup from "./components/DetailsPopup";
import StatusBar from "./components/StatusBar";
import TypeaheadPopup from "./components/TypeaheadPopup";
import Preview from "./components/Preview";
import Properties from "./components/Properties";

import "@/styles/views/Directory.css";

const Directory = () => {
  const { fs, path, setPath, view, search, refreshDir } = useStateContext();

  // Path of the entry currently being renamed inline (empty when none).
  const [renamingID, setRenamingID] = useState("");
  const [typeaheadQuery, setTypeaheadQuery] = useState("");

  const { filtered, sorted, previewables, sort, handleSort } =
    useDirectoryEntries(view);

  const { selectedIDs, setSelectedIDs, handleSelect } = useSelection();

  // Rubber-band selection over the empty floor of the directory.
  const directoryRef = useRef<HTMLDivElement>(null);
  const { marquee, onMouseDown: onMarqueeMouseDown } = useMarqueeSelection({
    containerRef: directoryRef,
    setSelectedIDs,
  });

  const details = useDetailsPopup();
  const preview = usePreview(previewables);
  const properties = useProperties();
  const fileOps = useFileOperations({ path, refreshDir, setSelectedIDs });

  const menu = useContextMenu();
  const isCurrentDirectory =
    menu.elementType === ENTRY_KIND.DIRECTORY && menu.elementID === path;

  const handleKeyboardOpen = useCallback(
    (entry: DirEntry) =>
      entry.metadata.isDir ? setPath(entry.path) : fs.open(entry.path),
    [fs, setPath],
  );

  useKeyboardNav({
    items: sorted,
    view,
    enabled: !preview.visible && !properties.visible,
    setSelectedIDs,
    onOpen: handleKeyboardOpen,
    onTypeaheadChange: setTypeaheadQuery,
  });

  useClipboardShortcuts({
    enabled: !preview.visible,
    selectedIDs,
    onCopy: fileOps.copy,
    onCut: fileOps.cut,
    onPaste: fileOps.paste,
    onDelete: fileOps.remove,
  });

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

      <div className="directory_content">
        {view === VIEW_MODE.LIST && sorted.length > 0 && (
          <ListHeader sort={sort} onSort={handleSort} />
        )}

        <EntriesView
          entries={sorted}
          view={view}
          selectedIDs={selectedIDs}
          renamingID={renamingID}
          contextMenuRef={menu.ref}
          onSelect={handleSelect}
          onRename={fileOps.rename}
          onCancelRename={() => setRenamingID("")}
          details={{
            setVisible: details.setVisible,
            setId: details.setId,
            setType: details.setType,
          }}
          menu={{
            setVisible: menu.setVisible,
            setId: menu.setElementID,
            setType: menu.setElementType,
          }}
        />

        {search && filtered.length === 0 && (
          <p className="no_results">{t.directory.noResults(search)}</p>
        )}
      </div>

      <StatusBar total={filtered.length} selected={selectedIDs.length} />

      <EntryContextMenu
        contextMenuRef={menu.ref}
        visible={menu.visible}
        onClose={() => menu.setVisible(false)}
        elementId={menu.elementID}
        elementType={menu.elementType}
        isCurrentDirectory={isCurrentDirectory}
        selectedIDs={selectedIDs}
        canPaste={!!fileOps.clipboard}
        fileOps={fileOps}
        onStartRename={setRenamingID}
        onPreview={preview.open}
        onProperties={properties.open}
      />

      <DetailsPopup
        visible={details.visible}
        id={details.id}
        type={details.type}
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
      />

      <Properties
        entry={properties.entry}
        visible={properties.visible}
        onClose={properties.close}
      />
    </div>
  );
};

export default Directory;
