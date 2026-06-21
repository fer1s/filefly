import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import { usePinnedFolders } from "./hooks/usePinnedFolders";
import { useSidebarScroll } from "./hooks/useSidebarScroll";
import SearchBar from "./components/SearchBar";
import VolumeItem from "./components/VolumeItem";
import FolderItem from "./components/FolderItem";

import { faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SideBar.css";

import type { SideBarProps } from "./types";

const SideBar = ({ collapsed, onToggle }: SideBarProps) => {
  const { volumes, setPath } = useStateContext();

  const pinned = usePinnedFolders();
  useSidebarScroll();

  return (
    <div className={classNames("SideBar", collapsed && "collapsed")}>
      <IconButton
        icon={collapsed ? faAnglesRight : faAnglesLeft}
        className="collapse_toggle"
        onClick={onToggle}
        title={collapsed ? t.sidebar.expand : t.sidebar.collapse}
        aria-label={collapsed ? t.sidebar.expand : t.sidebar.collapse}
      />

      {!collapsed && <SearchBar />}

      <section>
        {!collapsed && <h2>{t.sidebar.pinned}</h2>}
        <div className="section_content">
          {pinned.map((item) => (
            <FolderItem
              key={item.path}
              item={item}
              setPath={setPath}
              collapsed={collapsed}
            />
          ))}
        </div>
      </section>

      <section>
        {!collapsed && <h2>{t.sidebar.drives}</h2>}
        <div className="section_content">
          {volumes.map((volume, i) => (
            <VolumeItem
              key={`${volume.name}#${volume.mountPoint}`}
              volume={volume}
              setPath={setPath}
              index={i}
              collapsed={collapsed}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default SideBar;
