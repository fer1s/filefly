import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import { usePinnedFolders } from "./hooks/usePinnedFolders";
import { useHostName } from "./hooks/useHostName";
import SidebarSection from "./components/SidebarSection";
import VolumeItem from "./components/VolumeItem";
import FolderItem from "./components/FolderItem";
import { getPathLabel, getRecentPaths } from "./utils";

import { faBars, faFolder } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SideBar.css";

import type { SideBarProps } from "./types";

const SideBar = ({ collapsed, onToggle, visitedPaths }: SideBarProps) => {
  const { fs, path, volumes, setPath } = useStateContext();

  const hostName = useHostName(fs);
  const pinned = usePinnedFolders();
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
          className="collapse_toggle"
          onClick={onToggle}
          title={collapsed ? t.sidebar.expand : t.sidebar.collapse}
          aria-label={collapsed ? t.sidebar.expand : t.sidebar.collapse}
        />
        <span className="host_name">{hostName}</span>
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
        {pinned.map((item) => (
          <FolderItem
            key={item.path}
            item={item}
            setPath={setPath}
            collapsed={collapsed}
            active={item.path === path}
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
