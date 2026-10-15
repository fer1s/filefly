import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";
import { TRASH_DIR_NAME } from "@/shared/constants";
import {
  ENTRY_KIND,
  ACTION_SEPARATOR,
  ENTRY_ACTION,
  EntryContextMenu,
  useContextMenu,
  useDirectory,
} from "@/features/directory";

import "@/styles/components/PathCrumbs.css";

import { buildCrumbs } from "./utils";
import type { PathCrumbsProps } from "./types";

// Breadcrumbs expose a deliberately reduced folder menu. Keep the dividers aligned with the
// matching groups in the full folder context menu without duplicating any action behavior.
const PATH_CRUMB_ACTIONS = [
  ENTRY_ACTION.OPEN,
  ENTRY_ACTION.OPEN_IN_NEW_TAB,
  ENTRY_ACTION.OPEN_IN_TERMINAL,
  ACTION_SEPARATOR,
  ENTRY_ACTION.COPY_PATH,
  ACTION_SEPARATOR,
  ENTRY_ACTION.PROPERTIES,
] as const;

// Breadcrumb view of the current path: one clickable crumb per segment with a chevron between
// them. Clicking a crumb navigates to that ancestor; clicking the empty area opens the editable
// path input (so the raw path can be copied/pasted). Right-clicking a crumb opens its reduced
// folder context menu. The current (last) crumb is a no-op on left click.
const PathCrumbs = ({ path, onNavigate, onEditRequest }: PathCrumbsProps) => {
  const crumbs = buildCrumbs(path);
  const menu = useContextMenu();
  const { fileOps, setRenamingID, preview, properties } = useDirectory();

  return (
    <>
      <div className="PathCrumbs shadow" onClick={onEditRequest}>
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;
          return (
            <span className="crumb_group" key={crumb.path}>
              <Button
                className={classNames("crumb", isCurrent && "current")}
                // Stop propagation so a crumb click never falls through to the edit handler.
                onClick={(event) => {
                  event.stopPropagation();
                  if (!isCurrent) onNavigate(crumb.path);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  menu.openAt(
                    event.clientX,
                    event.clientY,
                    crumb.path,
                    ENTRY_KIND.DIRECTORY,
                  );
                }}
              >
                {crumb.label}
              </Button>
              {!isCurrent && (
                <Icon className="crumb_separator" icon={faChevronRight} />
              )}
            </span>
          );
        })}
      </div>

      <EntryContextMenu
        contextMenuRef={menu.ref}
        visible={menu.visible}
        onClose={() => menu.setVisible(false)}
        actionIds={PATH_CRUMB_ACTIONS}
        showTags={false}
        elementId={menu.elementID}
        elementType={menu.elementType}
        isCurrentDirectory={menu.elementID === path}
        inTrash={menu.elementID.endsWith(`/${TRASH_DIR_NAME}`)}
        selectedIDs={[]}
        canPaste={!!fileOps.clipboard}
        fileOps={fileOps}
        onStartRename={setRenamingID}
        onPreview={preview.open}
        onProperties={properties.open}
      />
    </>
  );
};

export default PathCrumbs;
