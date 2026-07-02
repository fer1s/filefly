import type { KeyboardEvent } from "react";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import { KEY } from "@/shared/constants";
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
  bindProps,
  dragging,
  translate = 0,
}: TabItemProps) => {
  const label = tabLabel(tab);

  // Standard tablist keys: Enter/Space activate; Left/Right move focus to the adjacent tab and
  // select it (selection follows focus). Siblings are read from the DOM via their data-tab-id.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === KEY.ENTER || event.key === KEY.SPACE) {
      event.preventDefault();
      onSelect(tab.id);
      return;
    }
    if (event.key === KEY.ARROW_RIGHT || event.key === KEY.ARROW_LEFT) {
      event.preventDefault();
      const sibling =
        event.key === KEY.ARROW_RIGHT
          ? event.currentTarget.nextElementSibling
          : event.currentTarget.previousElementSibling;
      if (sibling instanceof HTMLElement && sibling.dataset.tabId) {
        onSelect(sibling.dataset.tabId);
        sibling.focus();
      }
    }
  };

  return (
    <div
      {...bindProps}
      className={classNames(
        "TabItem",
        active && "active",
        dragging && "dragging",
      )}
      role="tab"
      aria-selected={active}
      data-tab-id={tab.id}
      tabIndex={active ? 0 : -1}
      // Live drag transform: the dragged tab follows the pointer; the others slide to open a gap.
      // Layout is untouched (transform only) until the drop commits the reorder.
      style={
        translate ? { transform: `translateX(${translate}px)` } : undefined
      }
      onClick={() => onSelect(tab.id)}
      onKeyDown={handleKeyDown}
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
