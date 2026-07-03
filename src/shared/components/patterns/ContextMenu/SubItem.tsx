import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

import { MENU_ITEM_ROLE } from "./constants";
import type { ContextMenuSubItem } from "./types";

// A single sub-row rendered inside a submenu flyout. Mirrors the main row layout so the two
// nest visually; a check marks the active choice. The `key` is supplied by the parent list.
export const SubItem = ({
  text,
  icon,
  checked,
  disabled,
  isSeparator,
  onClick,
}: Omit<ContextMenuSubItem, "key">) =>
  isSeparator ? (
    <div className="context_menu_item separator" role="separator"></div>
  ) : (
    <Button
      className="context_menu_item ctx_button"
      role={MENU_ITEM_ROLE}
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled ?? !onClick}
    >
      <span className="ctx_icon">{icon}</span>
      <span className="ctx_text">{text}</span>
      {checked && (
        <span className="ctx_check">
          <Icon icon={faCheck} />
        </span>
      )}
    </Button>
  );
