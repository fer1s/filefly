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
import { classNames } from "@/shared/utils";
import { RECENTS } from "@/shared/constants";
import { useSettings } from "@/features/settings";
import { Properties } from "@/features/directory";
import { t } from "@/lang";

import type { MouseEvent } from "react";

import { SIDEBAR_ITEM_KIND, type SidebarItemKind } from "./constants";
import { usePinnedFolders } from "./hooks/usePinnedFolders";
import { usePinnedShortcuts } from "./hooks/usePinnedShortcuts";
import { useSidebarContextMenu } from "./hooks/useSidebarContextMenu";
import { useSidebarProperties } from "./hooks/useSidebarProperties";
import SidebarSection from "./components/SidebarSection";
import SidebarContextMenu from "./components/SidebarContextMenu";
import VolumeItem from "./components/VolumeItem";
import FolderItem from "./components/FolderItem";

import {
  faBars,
  faClockRotateLeft,
  faPlus,
  faGear,
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

const SideBar = ({ collapsed, onToggle }: SideBarProps) => {
  const { path, volumes, setPath, newTab } = useStateContext();

  const { keymap } = useKeymap();
  const { open: openSettings } = useSettings();
  const pinned = usePinnedFolders();
  usePinnedShortcuts({ pinned, setPath });

  const menu = useSidebarContextMenu();
  const properties = useSidebarProperties();

  // Open the context menu at the cursor for a given row (path + kind).
  const onRowContextMenu =
    (itemPath: string, kind: SidebarItemKind) => (e: MouseEvent) => {
      e.preventDefault();
      menu.openAt(e.clientX, e.clientY, { path: itemPath, kind });
    };

  return (
    <div className={classNames("SideBar", collapsed && "collapsed")}>
      <div className="sidebar_header">
        <IconButton
          icon={faBars}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.MD}
          className="collapse_toggle"
          tooltip={collapsed ? t.sidebar.expand : t.sidebar.collapse}
          tooltipPlacement={TOOLTIP_PLACEMENT.RIGHT}
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
      </div>

      <SidebarSection title={t.sidebar.pinned}>
        <FolderItem
          item={RECENTS_ITEM}
          setPath={setPath}
          collapsed={collapsed}
          active={path === RECENTS}
          onContextMenu={onRowContextMenu(RECENTS_ITEM.path, RECENTS_ITEM.kind)}
        />
        {pinned.map((item, i) => (
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
        ))}
      </SidebarSection>

      <SidebarSection title={t.sidebar.volumes}>
        {volumes.map((volume, i) => (
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
            )}
          />
        ))}
      </SidebarSection>

      <SidebarSection title={t.sidebar.location}>
        <p className="section_todo">{t.sidebar.todo}</p>
      </SidebarSection>

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
