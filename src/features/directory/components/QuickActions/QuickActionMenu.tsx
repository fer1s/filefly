import type { MouseEvent } from "react";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import IconButton from "@/shared/components/elements/IconButton";
import {
  ContextMenu,
  ContextMenuItem,
  MENU_ROLE,
} from "@/shared/components/patterns/ContextMenu";

import { resolveActionIcon } from "../../actions";
import { useContextMenu } from "../../hooks/useContextMenu";

import type { QuickActionMenuProps } from "./types";

// Quick Bar button for an action whose choices live in a context-menu submenu (Sort By today).
// It renders those same descriptor-owned choices as a flat anchored menu instead of duplicating
// their labels, checked state, or behavior.
const QuickActionMenu = ({ action, ctx, label }: QuickActionMenuProps) => {
  const { ref: contextMenuRef, visible, openAt, setVisible } = useContextMenu();
  const items = action.submenu?.(ctx) ?? [];

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    const anchor = event.currentTarget.getBoundingClientRect();
    openAt(anchor.left, anchor.bottom, ctx.elementId, ctx.elementType);
  };

  return (
    <>
      {label ? (
        <Button
          unstyled
          className="quick_action_menu_label"
          onClick={openMenu}
          disabled={action.isEnabled ? !action.isEnabled(ctx) : false}
          aria-label={`${action.label()}: ${label}`}
          aria-haspopup={MENU_ROLE}
          aria-expanded={visible}
        >
          <Icon icon={resolveActionIcon(action, ctx)} />
          <span>{label}</span>
          <Icon icon={faChevronDown} />
        </Button>
      ) : (
        <IconButton
          icon={resolveActionIcon(action, ctx)}
          tooltip={action.label()}
          onClick={openMenu}
          disabled={action.isEnabled ? !action.isEnabled(ctx) : false}
          aria-haspopup={MENU_ROLE}
          aria-expanded={visible}
          className={action.color ? `qa_${action.color}` : undefined}
        />
      )}
      <ContextMenu contextMenuVisible={visible} ref={contextMenuRef}>
        {items.map((item) => (
          <ContextMenuItem
            key={item.key}
            isSeparator={item.isSeparator}
            text={item.label}
            icon={item.icon ? <Icon icon={item.icon} /> : undefined}
            checked={item.checked}
            onClick={
              item.onClick
                ? () => {
                    item.onClick?.();
                    setVisible(false);
                  }
                : undefined
            }
          />
        ))}
      </ContextMenu>
    </>
  );
};

export default QuickActionMenu;
