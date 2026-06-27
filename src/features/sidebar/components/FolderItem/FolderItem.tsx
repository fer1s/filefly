import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";

import type { FolderItemProps } from "./types";

const FolderItem = ({
  item,
  setPath,
  collapsed,
  active,
  hotkey,
}: FolderItemProps) => {
  return (
    <div
      className={classNames("folder_item", active && "active")}
      onClick={() => setPath(item.path)}
      title={collapsed ? item.name : undefined}
    >
      <Icon icon={item.icon} />
      <p>{item.name}</p>
      {hotkey && <span className="folder_hotkey">{hotkey}</span>}
    </div>
  );
};

export default FolderItem;
