import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import type { FolderItemProps } from "./types";

const FolderItem = ({ item, setPath, collapsed }: FolderItemProps) => {
  return (
    <div
      className="folder_item"
      onClick={() => setPath(item.path)}
      title={collapsed ? item.name : undefined}
    >
      <FontAwesomeIcon icon={item.icon} />
      <p>{item.name}</p>
    </div>
  );
};

export default FolderItem;
