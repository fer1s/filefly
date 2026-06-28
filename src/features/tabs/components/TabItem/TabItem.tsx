import { faXmark } from "@fortawesome/free-solid-svg-icons";

import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import { tabLabel } from "../../utils";
import type { TabItemProps } from "./types";

// A single tab: its folder-name label plus a close button. Selecting is a plain click;
// middle-click also closes (browser convention).
const TabItem = ({
  tab,
  active,
  closable,
  closeHotkey,
  onSelect,
  onClose,
}: TabItemProps) => {
  const label = tabLabel(tab);

  return (
    <div
      className={classNames("TabItem", active && "active")}
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(tab.id)}
      onAuxClick={(event) => {
        if (event.button === 1 && closable) onClose(tab.id);
      }}
    >
      <span className="tab_label">{label}</span>
      {closable && (
        <IconButton
          className="tab_close"
          icon={faXmark}
          size={ICON_BUTTON_SIZE.SM}
          variant={ICON_BUTTON_VARIANT.GHOST}
          tooltip={t.tabs.closeTab}
          hotkey={closeHotkey}
          aria-label={t.tabs.closeTab}
          onClick={(event) => {
            event.stopPropagation();
            onClose(tab.id);
          }}
        />
      )}
    </div>
  );
};

export default TabItem;
