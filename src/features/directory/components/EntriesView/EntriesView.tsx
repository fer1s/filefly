import { useStateContext } from "@/shared/providers/StateProvider";
import { DirEntryItem } from "../DirEntry";

import type { EntriesViewProps } from "./types";

// Renders the entries grid/list. The container owns selection, rename and the context-menu
// state; this component just wires each entry row to it.
const EntriesView = ({
  entries,
  view,
  selectedIDs,
  renamingID,
  contextMenuRef,
  onSelect,
  onRename,
  onCancelRename,
  menu,
}: EntriesViewProps) => {
  const { fs, setPath } = useStateContext();

  return (
    <div className={view}>
      {entries.map((entry) => (
        <DirEntryItem
          key={`${entry.name}#${entry.path}`}
          entry={entry}
          fs={fs}
          setPath={setPath}
          contextMenuRef={contextMenuRef}
          id={entry.path}
          selected={selectedIDs.includes(entry.path)}
          onSelect={onSelect}
          renaming={renamingID === entry.path}
          onRename={onRename}
          onCancelRename={onCancelRename}
          setContextMenuVisible={menu.setVisible}
          setContextMenuElementID={menu.setId}
          setContextMenuElementType={menu.setType}
        />
      ))}
    </div>
  );
};

export default EntriesView;
