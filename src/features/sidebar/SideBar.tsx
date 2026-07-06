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
import {
  RECENTS,
  TAG_COLOR,
  TAG_COLOR_CLASS,
  SSH_AUTH_FAILED,
  SSH_HOST_KEY_CHANGED,
  SFTP_SCHEME,
} from "@/shared/constants";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { useTags } from "@/shared/providers/TagsProvider";
import { useSettings } from "@/features/settings";
import {
  useConnections,
  ConnectionDialog,
  ConnectionAuthDialog,
} from "@/features/connections";
import { notify, TOAST_TYPE } from "@/shared/toast";
import type { Connection } from "@/shared/services/api";
import { Properties } from "@/features/directory";
import { t } from "@/lang";

import { useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

import ConfirmationDialog from "@/shared/components/patterns/ConfirmationDialog";

import {
  SIDEBAR_GROUP,
  SIDEBAR_ITEM_KIND,
  RECENTS_ITEM,
  GROUP_META,
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
import { ejectVolume } from "@/shared/services/ejectVolume";
import FolderItem from "./components/FolderItem";
import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";

import {
  faBars,
  faPlus,
  faGear,
  faPenToSquare,
  faFolder,
  faCircle,
  faServer,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SideBar.css";

import type {
  SideBarProps,
  PendingItemRemoval,
  PendingGroupRemoval,
} from "./types";

const SideBar = ({ collapsed, onToggle }: SideBarProps) => {
  const { fs, path, volumes, setPath, setVolumes, sidebarOpacity, newTab } =
    useStateContext();
  const { pickFolder } = useFolderPicker();
  const { allTags } = useTags();

  const { keymap } = useKeymap();
  const { open: openSettings } = useSettings();
  const {
    connections,
    manager: connectionsManager,
    reload: reloadConnections,
  } = useConnections();
  // Open state for the create-connection form (opened from the Network group's "+").
  const [connectionFormOpen, setConnectionFormOpen] = useState(false);
  // The connection being edited (null = not editing); drives the same form dialog prefilled.
  const [editConnectionTarget, setEditConnectionTarget] =
    useState<Connection | null>(null);
  // The connection whose auth failed, showing the interactive re-auth dialog (null = hidden).
  const [authConnection, setAuthConnection] = useState<Connection | null>(null);
  const { confirm } = useConfirm();

  // The connection id embedded in a row's `sftp://<id>` path.
  const connectionId = (path: string) =>
    path.slice(SFTP_SCHEME.length).split("/")[0];

  // Open the connection form prefilled to edit the clicked connection.
  const editConnection = (path: string) => {
    const conn = connections.find((c) => c.id === connectionId(path));
    if (conn) setEditConnectionTarget(conn);
  };

  // Confirm, then delete the clicked connection (app-side only; the server is untouched).
  const removeConnection = async (path: string) => {
    const conn = connections.find((c) => c.id === connectionId(path));
    if (!conn) return;
    const ok = await confirm({
      title: t.connections.remove,
      message: t.connections.confirmRemove(conn.name),
      destructive: true,
    });
    if (!ok) return;
    try {
      await connectionsManager.remove(conn.id);
      reloadConnections();
      notify(t.connections.removed, TOAST_TYPE.SUCCESS);
    } catch (err) {
      notify(t.connections.removeError(String(err)), TOAST_TYPE.ERROR);
    }
  };
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
  const [pendingRemoval, setPendingRemoval] =
    useState<PendingItemRemoval | null>(null);
  // The custom group awaiting delete-confirmation (deleting it takes all its items).
  const [pendingGroupRemoval, setPendingGroupRemoval] =
    useState<PendingGroupRemoval | null>(null);

  // Open the context menu at the cursor for a given row (path + kind, plus ejectable flag for
  // volumes so Eject can show only for external/removable devices).
  const onRowContextMenu =
    (itemPath: string, kind: SidebarItemKind, isEjectable?: boolean) =>
    (e: MouseEvent) => {
      e.preventDefault();
      menu.openAt(e.clientX, e.clientY, { path: itemPath, kind, isEjectable });
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
  // The Network group is special: its "+" opens the create-connection form instead of a folder.
  const onAddItem =
    (id: string, builtinCount: number) => async (index: number) => {
      if (id === SIDEBAR_GROUP.NETWORK) {
        setConnectionFormOpen(true);
        return;
      }
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

  // Open a connection on its home directory (where `ssh` lands), resolved over SFTP. An auth failure
  // opens the interactive re-auth dialog; any other error falls back to the root path (whose load
  // then surfaces the error toast).
  const openConnection = (connection: Connection) => {
    connectionsManager
      .home(connection.id)
      .then(setPath)
      .catch((err) => {
        const message = String(err);
        if (message.includes(SSH_AUTH_FAILED)) setAuthConnection(connection);
        else if (message.includes(SSH_HOST_KEY_CHANGED))
          notify(t.connections.hostKeyChanged, TOAST_TYPE.ERROR);
        else setPath(connectionsManager.rootPath(connection.id));
      });
  };

  // Open a connection in a new tab, landing on its home dir (falls back to the root on lookup fail).
  const openConnectionInNewTab = (connection: Connection) => {
    connectionsManager
      .home(connection.id)
      .then(newTab)
      .catch(() => newTab(connectionsManager.rootPath(connection.id)));
  };

  // Saved SSH/SFTP connections (see SSH_PLAN.md). Clicking opens the connection's home dir; the row
  // stays highlighted for any remote folder browsed under it (prefix match).
  const connectionRows = connections.map((connection) => {
    const prefix = connectionsManager.prefix(connection.id);
    return (
      <FolderItem
        key={`connection:${connection.id}`}
        item={{
          name: connection.name,
          path: prefix,
          icon: faServer,
          kind: SIDEBAR_ITEM_KIND.CONNECTION,
        }}
        setPath={() => openConnection(connection)}
        collapsed={collapsed}
        active={path === prefix || path.startsWith(`${prefix}/`)}
        onContextMenu={onRowContextMenu(prefix, SIDEBAR_ITEM_KIND.CONNECTION)}
        onOpenInNewTab={() => openConnectionInNewTab(connection)}
      />
    );
  });

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
          volume.isEjectable,
        )}
        onEject={
          !collapsed && volume.isEjectable
            ? () =>
                ejectVolume(fs, volume.mountPoint, () =>
                  fs.listVolumes().then(setVolumes),
                )
            : undefined
        }
      />
    )),
    // Saved connections (built-in) then user-added network locations. Placeholder only when both
    // are empty. An array so SidebarSection can interleave add-item inserts between rows.
    [SIDEBAR_GROUP.NETWORK]:
      connectionRows.length || networkRows.length ? (
        [...connectionRows, ...networkRows]
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
    [SIDEBAR_GROUP.NETWORK]: connectionRows.length,
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
        editConnection={editConnection}
        removeConnection={removeConnection}
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
      <ConnectionDialog
        visible={connectionFormOpen || editConnectionTarget !== null}
        initial={editConnectionTarget}
        onClose={() => {
          setConnectionFormOpen(false);
          setEditConnectionTarget(null);
        }}
        onSubmit={async (connection) => {
          const isEdit = editConnectionTarget !== null;
          await connectionsManager.add(connection);
          reloadConnections();
          setConnectionFormOpen(false);
          setEditConnectionTarget(null);
          notify(
            isEdit ? t.common.saved : t.connections.added,
            TOAST_TYPE.SUCCESS,
          );
        }}
      />
      <ConnectionAuthDialog
        connection={authConnection}
        onClose={() => setAuthConnection(null)}
        onRetry={async (secret) => {
          const conn = authConnection;
          if (!conn) return;
          // Store the entered secret (if any) as both password and key passphrase so it covers
          // password auth and an encrypted key; empty just re-attempts (ssh-agent case).
          if (secret) {
            await connectionsManager.add({
              ...conn,
              password: secret,
              keyPassphrase: secret,
            });
          }
          const home = await connectionsManager.home(conn.id);
          setPath(home);
          setAuthConnection(null);
        }}
      />
    </div>
  );
};

export default SideBar;
