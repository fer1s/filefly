import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { faCheck, faChevronRight } from "@fortawesome/free-solid-svg-icons";

import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";
import { KEY, UI_COLOR } from "@/shared/constants";

import { SubItem } from "./SubItem";
import {
  MENU_ITEM_ROLE,
  SUBMENU_CLOSE_DELAY,
  SUBMENU_VIEWPORT_PADDING,
} from "./constants";
import type { ContextMenuItemProps } from "./types";

export const ContextMenuItem = ({
  isSeparator,
  onClick,
  text,
  icon,
  hotkey,
  disabled,
  color = UI_COLOR.DEFAULT,
  checked,
  submenu,
}: ContextMenuItemProps) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const openSubmenu = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSubmenu = () => {
    closeTimer.current = window.setTimeout(
      () => setOpen(false),
      SUBMENU_CLOSE_DELAY,
    );
  };

  // Position the flyout to the right of its parent row (flipping left / clamping up when it
  // would run off-screen). The menu itself scrolls (overflow), so the flyout is portaled to the
  // body and fixed-positioned to escape that clipping.
  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current?.getBoundingClientRect();
    const el = flyoutRef.current;
    if (!anchor || !el) return;

    let left = anchor.right + 2;
    if (left + el.offsetWidth > window.innerWidth - SUBMENU_VIEWPORT_PADDING)
      left = anchor.left - el.offsetWidth - 2;
    left = Math.max(SUBMENU_VIEWPORT_PADDING, left);

    let top = anchor.top - 4;
    const maxTop =
      window.innerHeight - el.offsetHeight - SUBMENU_VIEWPORT_PADDING;
    top = Math.max(SUBMENU_VIEWPORT_PADDING, Math.min(top, maxTop));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [open]);

  // The flyout is detached (portaled to <body>), so mouse-out alone can't cover every close: an
  // Escape or an outside press that closes the parent menu would otherwise leave it orphaned.
  // Close on either, but never on a press inside the flyout or its parent row (that's a pick).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        flyoutRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === KEY.ESCAPE) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isSeparator)
    return <div className="context_menu_item separator" role="separator"></div>;

  // A submenu parent isn't itself actionable (it opens on hover), so it stays enabled without a
  // handler; other rows default to disabled when no handler is given.
  const isDisabled = submenu ? false : (disabled ?? !onClick);

  const row = (
    <Button
      ref={submenu ? anchorRef : undefined}
      className={classNames(
        "context_menu_item ctx_button",
        color !== UI_COLOR.DEFAULT && `ctx_${color}`,
        submenu && "has_submenu",
      )}
      role={MENU_ITEM_ROLE}
      // Roving focus: items aren't individual Tab stops; arrow keys move focus (see ContextMenu).
      tabIndex={-1}
      onClick={onClick}
      disabled={isDisabled}
    >
      <span className="ctx_icon">{icon}</span>
      <span className="ctx_text">{text}</span>
      {hotkey && <span className="ctx_hotkey">{hotkey}</span>}
      {checked && (
        <span className="ctx_check">
          <Icon icon={faCheck} />
        </span>
      )}
      {submenu && (
        <span className="ctx_submenu_arrow">
          <Icon icon={faChevronRight} />
        </span>
      )}
    </Button>
  );

  if (!submenu) return row;

  return (
    <div
      className="context_menu_item_wrapper"
      onMouseEnter={openSubmenu}
      onMouseLeave={closeSubmenu}
    >
      {row}
      {open &&
        createPortal(
          <div
            ref={flyoutRef}
            className="context_menu context_menu_submenu visible"
            role="menu"
            aria-orientation="vertical"
            onMouseEnter={openSubmenu}
            onMouseLeave={closeSubmenu}
          >
            {submenu.map(({ key, ...sub }) => (
              <SubItem
                key={key}
                {...sub}
                onClick={
                  sub.onClick
                    ? () => {
                        sub.onClick?.();
                        setOpen(false);
                      }
                    : undefined
                }
              />
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};
