import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { TOOLTIP_PLACEMENT } from "@/shared/components/elements/Tooltip";
import {
  useKeymap,
  formatBinding,
  isMacPlatform,
  KEYMAP_ACTION,
  PINNED_ACTIONS,
} from "@/shared/keymap";
import { classNames, basename, tagsPath } from "@/shared/utils";
import { useFolderPicker } from "@/shared/providers/FolderPickerProvider";
import { RECENTS, TAG_COLOR, TAG_COLOR_CLASS } from "@/shared/constants";
import { useTags } from "@/shared/providers/TagsProvider";
import { useSettings } from "@/features/settings";
import { Properties } from "@/features/directory";
import { t } from "@/lang";

import { useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

import ConfirmationDialog from "@/shared/components/patterns/ConfirmationDialog";

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
import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";

import {
  faBars,
  faClockRotateLeft,
  faPlus,
  faGear,
  faPenToSquare,
  faFolder,
  faCircle,
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
const GROUP_META: Record<SidebarGroupId, { title: string; editable: boolean }> =
  {
    [SIDEBAR_GROUP.PINNED]: { title: t.sidebar.pinned, editable: true },
    [SIDEBAR_GROUP.VOLUMES]: { title: t.sidebar.volumes, editable: false },
    [SIDEBAR_GROUP.NETWORK]: { title: t.sidebar.network, editable: true },
    // System-managed like Volumes: reorderable, but the rows are the live Finder tags.
    [SIDEBAR_GROUP.TAGS]: { title: t.sidebar.tags, editable: false },
  };

const SideBar = ({ collapsed, onToggle }: SideBarProps) => {
  const { path, volumes, setPath, sidebarOpacity } = useStateContext();
  const { pickFolder } = useFolderPicker();
  const { allTags } = useTags();

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
  const { bind, styleFor, registerRef, draggingId, snapping } =
    useGroupDragSort(groups.order, groups.reorder);
  // The custom item awaiting delete-confirmation (null when the dialog is closed).
  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    path: string;
  } | null>(null);
  // The custom group awaiting delete-confirmation (deleting it takes all its items).
  const [pendingGroupRemoval, setPendingGroupRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Open the context menu at the cursor for a given row (path + kind, plus removable flag for
  // volumes so Eject can show only for external devices).
  const onRowContextMenu =
    (itemPath: string, kind: SidebarItemKind, isRemovable?: boolean) =>
    (e: MouseEvent) => {
      e.preventDefault();
      menu.openAt(e.clientX, e.clientY, { path: itemPath, kind, isRemovable });
    };

  // User-added rows for a group (its persisted custom items), shown below the built-in rows.
  const customRows = (id: string) =>
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
        onRemove={
          editingSidebar
            ? () => setPendingRemoval({ id, path: itemPath })
            : undefined
        }
      />
    ));

  // Pick a folder and add it to the group. The clicked insert index spans built-in + custom rows,
  // so subtract the built-in count to land at the right slot within the persisted custom items.
  const onAddItem =
    (id: string, builtinCount: number) => async (index: number) => {
      // Open the custom picker at the folder currently in view (skip sentinels like Recents/tags).
      const folder = await pickFolder({
        startPath: path.startsWith("/") ? path : "",
      });
      if (folder) groups.addItem(id, folder, Math.max(0, index - builtinCount));
    };

  // Content for a user-created group: its custom rows, or an empty-state hint when not editing.
  const customGroupContent = (id: string) => {
    const rows = customRows(id);
    if (rows.length) return rows;
    return editingSidebar ? (
      rows
    ) : (
      <p className="section_todo">{t.sidebar.emptyGroup}</p>
    );
  };

  // The rows for each group. Rendered in the user's saved order below; the group shell (header,
  // edit affordances, drag handle) is the same SidebarSection for all of them.
  const networkRows = customRows(SIDEBAR_GROUP.NETWORK);

  // Presets are hidden, not deleted (we couldn't re-create them). In edit mode show them all so a
  // hidden one can be toggled back on; otherwise drop the hidden ones. Each keeps its original
  // index so its hotkey slot (Cmd/Ctrl+1..6) stays correct regardless of what's filtered out.
  const hiddenPinnedPresets = new Set(
    groups.hiddenPresets(SIDEBAR_GROUP.PINNED),
  );
  const visiblePinned = pinned
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        editingSidebar ||
        !item.presetId ||
        !hiddenPinnedPresets.has(item.presetId),
    );
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
      ...visiblePinned.map(({ item, index }) => (
        <FolderItem
          key={item.path}
          item={item}
          setPath={setPath}
          collapsed={collapsed}
          active={item.path === path}
          hotkey={
            index < PINNED_ACTIONS.length
              ? formatBinding(keymap[PINNED_ACTIONS[index]])
              : undefined
          }
          hidden={!!item.presetId && hiddenPinnedPresets.has(item.presetId)}
          onToggleHidden={
            editingSidebar && item.presetId
              ? () =>
                  groups.toggleHiddenPreset(
                    SIDEBAR_GROUP.PINNED,
                    item.presetId!,
                  )
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
    // Finder tags — the tags actually in use (their real names + colours), discovered at runtime.
    // Clicking one opens its Spotlight tag view. macOS-only (the group is hidden otherwise below).
    [SIDEBAR_GROUP.TAGS]: allTags.map((tag) => {
      const itemPath = tagsPath(tag.name);
      const colorClass =
        TAG_COLOR_CLASS[tag.color] ?? TAG_COLOR_CLASS[TAG_COLOR.NONE];
      return (
        <FolderItem
          key={tag.name}
          item={{
            name: tag.name,
            path: itemPath,
            icon: faCircle,
            kind: SIDEBAR_ITEM_KIND.TAG,
          }}
          className={`tag_${colorClass}`}
          setPath={setPath}
          collapsed={collapsed}
          active={path === itemPath}
          onContextMenu={onRowContextMenu(itemPath, SIDEBAR_ITEM_KIND.TAG)}
        />
      );
    }),
  };

  // Built-in (non-custom) row counts, so onAddItem can map the clicked gap to a custom slot.
  const builtinCount: Record<SidebarGroupId, number> = {
    [SIDEBAR_GROUP.PINNED]: 1 + visiblePinned.length,
    [SIDEBAR_GROUP.VOLUMES]: volumes.length,
    [SIDEBAR_GROUP.NETWORK]: 0,
    [SIDEBAR_GROUP.TAGS]: allTags.length,
  };

  // Tags is macOS-only and only meaningful once tags exist; keep its slot in the saved order but
  // skip rendering it otherwise.
  const showTags = isMacPlatform() && allTags.length > 0;

  return (
    <div
      ref={sidebarRef}
      className={classNames(
        "SideBar",
        collapsed && "collapsed",
        snapping && "snapping",
      )}
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
          icon={faPenToSquare}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.MD}
          className="edit_toggle"
          tooltip={
            editingSidebar ? t.sidebar.doneEditing : t.sidebar.editSidebar
          }
          tooltipPlacement={TOOLTIP_PLACEMENT.RIGHT}
          onClick={toggleEditMode}
          aria-pressed={editingSidebar}
          aria-label={
            editingSidebar ? t.sidebar.doneEditing : t.sidebar.editSidebar
          }
        />
      </div>

      {groups.order.map((id) => {
        if (id === SIDEBAR_GROUP.TAGS && !showTags) return null;
        // Custom groups have no built-in metadata/content: they're always editable + deletable and
        // render only their user-added rows. Built-in groups keep their fixed title/content.
        const custom = groups.isCustom(id);
        const meta = custom ? undefined : GROUP_META[id as SidebarGroupId];
        const editable = custom || (meta?.editable ?? false);
        const title = groups.name(
          id,
          custom ? t.sidebar.newGroupName : meta!.title,
        );
        const content = custom
          ? customGroupContent(id)
          : groupContent[id as SidebarGroupId];
        const insertBase = custom ? 0 : builtinCount[id as SidebarGroupId];
        return (
          <SidebarSection
            key={id}
            ref={registerRef(id)}
            title={title}
            editing={editingSidebar}
            style={styleFor(id)}
            dragging={draggingId === id}
            dragHandleProps={editingSidebar ? bind(id) : undefined}
            onRename={editable ? (name) => groups.rename(id, name) : undefined}
            onAddItem={editable ? onAddItem(id, insertBase) : undefined}
            onDelete={
              custom
                ? () => setPendingGroupRemoval({ id, name: title })
                : undefined
            }
          >
            {content}
          </SidebarSection>
        );
      })}

      {editingSidebar && (
        <Button
          className="add_group_button"
          onClick={() => groups.addGroup(t.sidebar.newGroupName)}
          aria-label={t.sidebar.addGroup}
        >
          <Icon icon={faPlus} />
          <span>{t.sidebar.addGroup}</span>
        </Button>
      )}

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
      <ConfirmationDialog
        visible={!!pendingRemoval}
        title={t.sidebar.removeItemTitle}
        message={
          pendingRemoval
            ? t.sidebar.confirmRemoveItem(basename(pendingRemoval.path))
            : ""
        }
        confirmLabel={t.sidebar.removeItem}
        destructive
        onConfirm={() => {
          if (pendingRemoval)
            groups.removeItem(pendingRemoval.id, pendingRemoval.path);
          setPendingRemoval(null);
        }}
        onClose={() => setPendingRemoval(null)}
      />
      <ConfirmationDialog
        visible={!!pendingGroupRemoval}
        title={t.sidebar.deleteGroupTitle}
        message={
          pendingGroupRemoval
            ? t.sidebar.confirmDeleteGroup(pendingGroupRemoval.name)
            : ""
        }
        confirmLabel={t.sidebar.deleteGroup}
        destructive
        onConfirm={() => {
          if (pendingGroupRemoval) groups.deleteGroup(pendingGroupRemoval.id);
          setPendingGroupRemoval(null);
        }}
        onClose={() => setPendingGroupRemoval(null)}
      />
    </div>
  );
};

export default SideBar;
