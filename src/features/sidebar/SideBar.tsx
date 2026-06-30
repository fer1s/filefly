import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { TOOLTIP_PLACEMENT } from "@/shared/components/elements/Tooltip";
import {
  useKeymap,
  formatBinding,
  KEYMAP_ACTION,
  PINNED_ACTIONS,
} from "@/shared/keymap";
import { classNames, basename } from "@/shared/utils";
import { pickFolder } from "@/shared/services/api";
import { RECENTS } from "@/shared/constants";
import { useSettings } from "@/features/settings";
import { Properties } from "@/features/directory";
import { t } from "@/lang";

import type { CSSProperties, MouseEvent, ReactNode } from "react";

import {
  SIDEBAR_GROUP,
  SIDEBAR_ITEM_KIND,
  type SidebarGroupId,
  type SidebarItemKind,
} from "./constants";
import { usePinnedFolders } from "./hooks/usePinnedFolders";
import { useSidebarGroups } from "./hooks/useSidebarGroups";
import { useSidebarEditMode } from "./hooks/useSidebarEditMode";
import { useGroupDragSort } from "./hooks/useGroupDragSort";
import { usePinnedShortcuts } from "./hooks/usePinnedShortcuts";
import { useSidebarShortcuts } from "./hooks/useSidebarShortcuts";
import { useSidebarContextMenu } from "./hooks/useSidebarContextMenu";
import { useEntryProperties } from "@/shared/hooks/useEntryProperties";
import SidebarSection from "./components/SidebarSection";
import SidebarContextMenu from "./components/SidebarContextMenu";
import VolumeItem from "./components/VolumeItem";
import FolderItem from "./components/FolderItem";

import {
  faBars,
  faClockRotateLeft,
  faPlus,
  faGear,
  faPenToSquare,
  faFolder,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SideBar.css";

import type { SideBarProps } from "./types";

// Finder-style "Recents" — a pinned entry that opens the virtual recent-files listing.
const RECENTS_ITEM = {
  name: t.sidebar.recents,
  path: RECENTS,
  icon: faClockRotateLeft,
  kind: SIDEBAR_ITEM_KIND.RECENTS,
};

// Per-group metadata: the built-in default title and whether the group is user-editable
// (rename + add items). Volumes is system-managed, so it's reorderable but not editable.
const GROUP_META: Record<
  SidebarGroupId,
  { title: string; editable: boolean }
> = {
  [SIDEBAR_GROUP.PINNED]: { title: t.sidebar.pinned, editable: true },
  [SIDEBAR_GROUP.VOLUMES]: { title: t.sidebar.volumes, editable: false },
  [SIDEBAR_GROUP.NETWORK]: { title: t.sidebar.network, editable: true },
};

const SideBar = ({ collapsed, onToggle }: SideBarProps) => {
  const { path, volumes, setPath, newTab, sidebarOpacity } = useStateContext();

  const { keymap } = useKeymap();
  const { open: openSettings } = useSettings();
  const pinned = usePinnedFolders();
  const groups = useSidebarGroups();
  const {
    ref: sidebarRef,
    editing: editingSidebar,
    toggle: toggleEditMode,
  } = useSidebarEditMode();
  usePinnedShortcuts({ pinned, setPath });
  useSidebarShortcuts({ onToggle });

  const menu = useSidebarContextMenu();
  const properties = useEntryProperties();
  const { bind, dragStyle, registerRef, draggingId } = useGroupDragSort(
    groups.order,
    groups.reorder,
  );

  // Open the context menu at the cursor for a given row (path + kind, plus removable flag for
  // volumes so Eject can show only for external devices).
  const onRowContextMenu =
    (itemPath: string, kind: SidebarItemKind, isRemovable?: boolean) =>
    (e: MouseEvent) => {
      e.preventDefault();
      menu.openAt(e.clientX, e.clientY, { path: itemPath, kind, isRemovable });
    };

  // User-added rows for a group (its persisted custom items), shown below the built-in rows.
  const customRows = (id: SidebarGroupId) =>
    groups.items(id).map((itemPath) => (
      <FolderItem
        key={`custom:${itemPath}`}
        item={{
          name: basename(itemPath),
          path: itemPath,
          icon: faFolder,
          kind: SIDEBAR_ITEM_KIND.FOLDER,
        }}
        setPath={setPath}
        collapsed={collapsed}
        active={itemPath === path}
        onContextMenu={onRowContextMenu(itemPath, SIDEBAR_ITEM_KIND.FOLDER)}
      />
    ));

  // Pick a folder and add it to the group. The clicked insert index spans built-in + custom rows,
  // so subtract the built-in count to land at the right slot within the persisted custom items.
  const onAddItem =
    (id: SidebarGroupId, builtinCount: number) => async (index: number) => {
      const folder = await pickFolder();
      if (folder) groups.addItem(id, folder, Math.max(0, index - builtinCount));
    };

  // The rows for each group. Rendered in the user's saved order below; the group shell (header,
  // edit affordances, drag handle) is the same SidebarSection for all of them.
  const networkRows = customRows(SIDEBAR_GROUP.NETWORK);
  const groupContent: Record<SidebarGroupId, ReactNode> = {
    // An array (not a fragment) so SidebarSection's Children.toArray sees each row individually
    // and can interleave the add-item inserts between them.
    [SIDEBAR_GROUP.PINNED]: [
      <FolderItem
        key={RECENTS_ITEM.path}
        item={RECENTS_ITEM}
        setPath={setPath}
        collapsed={collapsed}
        active={path === RECENTS}
        onContextMenu={onRowContextMenu(RECENTS_ITEM.path, RECENTS_ITEM.kind)}
      />,
      ...pinned.map((item, i) => (
        <FolderItem
          key={item.path}
          item={item}
          setPath={setPath}
          collapsed={collapsed}
          active={item.path === path}
          hotkey={
            i < PINNED_ACTIONS.length
              ? formatBinding(keymap[PINNED_ACTIONS[i]])
              : undefined
          }
          onContextMenu={onRowContextMenu(item.path, item.kind)}
        />
      )),
      ...customRows(SIDEBAR_GROUP.PINNED),
    ],
    [SIDEBAR_GROUP.VOLUMES]: volumes.map((volume, i) => (
      <VolumeItem
        key={`${volume.name}#${volume.mountPoint}`}
        volume={volume}
        setPath={setPath}
        index={i}
        collapsed={collapsed}
        active={volume.mountPoint === path}
        onContextMenu={onRowContextMenu(
          volume.mountPoint,
          SIDEBAR_ITEM_KIND.VOLUME,
          volume.isRemovable,
        )}
      />
    )),
    // Show the placeholder only until the user adds their first network location.
    [SIDEBAR_GROUP.NETWORK]: networkRows.length ? (
      networkRows
    ) : (
      <p className="section_todo">{t.sidebar.todo}</p>
    ),
  };

  // Built-in (non-custom) row counts, so onAddItem can map the clicked gap to a custom slot.
  const builtinCount: Record<SidebarGroupId, number> = {
    [SIDEBAR_GROUP.PINNED]: 1 + pinned.length,
    [SIDEBAR_GROUP.VOLUMES]: volumes.length,
    [SIDEBAR_GROUP.NETWORK]: 0,
  };

  return (
    <div
      ref={sidebarRef}
      className={classNames("SideBar", collapsed && "collapsed")}
      // Drives the alpha of --color-background-sidebar (see theme.css); set by the user in Settings.
      style={{ "--sidebar-opacity": sidebarOpacity } as CSSProperties}
    >
      <div className="sidebar_header">
        <IconButton
          icon={faBars}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.MD}
          className="collapse_toggle"
          tooltip={collapsed ? t.sidebar.expand : t.sidebar.collapse}
          tooltipPlacement={TOOLTIP_PLACEMENT.RIGHT}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.TOGGLE_SIDEBAR])}
          onClick={onToggle}
          aria-label={collapsed ? t.sidebar.expand : t.sidebar.collapse}
        />
        <IconButton
          icon={faGear}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.MD}
          className="settings_toggle"
          tooltip={t.sidebar.settings}
          tooltipPlacement={TOOLTIP_PLACEMENT.RIGHT}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.OPEN_SETTINGS])}
          onClick={openSettings}
          aria-label={t.sidebar.settings}
        />
        <IconButton
          icon={faPlus}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.MD}
          className="new_tab_toggle"
          tooltip={t.tabs.newTab}
          tooltipPlacement={TOOLTIP_PLACEMENT.RIGHT}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.NEW_TAB])}
          onClick={() => newTab()}
          aria-label={t.tabs.newTab}
        />
        <IconButton
          icon={faPenToSquare}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.MD}
          className="edit_toggle"
          tooltip={editingSidebar ? t.sidebar.doneEditing : t.sidebar.editSidebar}
          tooltipPlacement={TOOLTIP_PLACEMENT.RIGHT}
          onClick={toggleEditMode}
          aria-pressed={editingSidebar}
          aria-label={editingSidebar ? t.sidebar.doneEditing : t.sidebar.editSidebar}
        />
      </div>

      {groups.order.map((id) => {
        const { title, editable } = GROUP_META[id];
        return (
          <SidebarSection
            key={id}
            ref={registerRef(id)}
            title={groups.name(id, title)}
            editing={editingSidebar}
            style={dragStyle(id)}
            dragging={draggingId === id}
            dragHandleProps={editingSidebar ? bind(id) : undefined}
            onRename={
              editable ? (name) => groups.rename(id, name) : undefined
            }
            onAddItem={editable ? onAddItem(id, builtinCount[id]) : undefined}
          >
            {groupContent[id]}
          </SidebarSection>
        );
      })}

      <SidebarContextMenu
        contextMenuRef={menu.ref}
        visible={menu.visible}
        target={menu.target}
        onClose={menu.close}
        openProperties={properties.open}
      />
      <Properties
        entry={properties.entry}
        visible={properties.visible}
        onClose={properties.close}
      />
    </div>
  );
};

export default SideBar;
