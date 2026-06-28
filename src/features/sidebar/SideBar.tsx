import { useCallback, useEffect } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { TOOLTIP_PLACEMENT } from "@/shared/components/elements/Tooltip";
import {
  useKeymap,
  formatBinding,
  matchesBinding,
  KEYMAP_ACTION,
  PINNED_ACTIONS,
} from "@/shared/keymap";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import { usePinnedFolders } from "./hooks/usePinnedFolders";
import { usePinnedShortcuts } from "./hooks/usePinnedShortcuts";
import SidebarSection from "./components/SidebarSection";
import VolumeItem from "./components/VolumeItem";
import FolderItem from "./components/FolderItem";
import { getPathLabel, getRecentPaths } from "./utils";

import {
  faBars,
  faFolder,
  faPlus,
  faGear,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SideBar.css";

import type { SideBarProps } from "./types";

const SideBar = ({ collapsed, onToggle, visitedPaths }: SideBarProps) => {
  const { path, volumes, setPath, newTab } = useStateContext();

  const { keymap } = useKeymap();
  const pinned = usePinnedFolders();
  usePinnedShortcuts({ pinned, setPath });

  // Single entry point shared by the gear button and the VS Code-style shortcut (Cmd/Ctrl + ,).
  // TODO: open a settings view here once one exists.
  const openSettings = useCallback(() => {}, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (matchesBinding(event, keymap[KEYMAP_ACTION.OPEN_SETTINGS])) {
        event.preventDefault();
        openSettings();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [keymap, openSettings]);
  const recentPaths = getRecentPaths(path, visitedPaths);
  const recent = recentPaths.map((recentPath) => ({
    name: getPathLabel(recentPath),
    path: recentPath,
    icon: faFolder,
  }));

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
          onClick={newTab}
          aria-label={t.tabs.newTab}
        />
      </div>

      <SidebarSection title={t.sidebar.recent} hideWhenCollapsed>
        {recent.map((item) => (
          <FolderItem
            key={item.path}
            item={item}
            setPath={setPath}
            collapsed={collapsed}
            active={item.path === path}
          />
        ))}
      </SidebarSection>

      <SidebarSection title={t.sidebar.pinned}>
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
          />
        ))}
      </SidebarSection>

      <SidebarSection title={t.sidebar.location}>
        <p className="section_todo">{t.sidebar.todo}</p>
      </SidebarSection>
    </div>
  );
};

export default SideBar;
