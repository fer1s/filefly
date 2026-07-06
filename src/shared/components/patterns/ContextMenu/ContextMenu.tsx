import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { KeyboardEvent } from "react";

import { classNames } from "@/shared/utils";
import { KEY } from "@/shared/constants";
import "@/styles/components/ContextMenu.css";

import { MENU_ITEM_SELECTOR } from "./constants";
import type { ContextMenuProps } from "./types";

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ children, contextMenuVisible }, ref) => {
    // The parent needs the DOM node (positioning + outside-click), and so does the focus/arrow
    // logic here — expose the inner node through the forwarded ref.
    const innerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLDivElement, []);

    // Move keyboard focus into the menu when it opens so the arrow keys work immediately.
    useEffect(() => {
      if (!contextMenuVisible) return;
      innerRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
    }, [contextMenuVisible]);

    // Arrow keys roam between items (wrapping); Home/End jump to the ends.
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      // Only roam visible rows: collapsed submenu flyouts also carry role=menuitem, but
      // focusing a display:none element is a dead step. offsetParent is null when hidden.
      const items = Array.from(
        innerRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ??
          [],
      ).filter((el) => el.offsetParent !== null);
      if (!items.length) return;

      const current = items.indexOf(document.activeElement as HTMLElement);
      let next: number | null = null;
      if (event.key === KEY.ARROW_DOWN)
        next = (current + 1 + items.length) % items.length;
      else if (event.key === KEY.ARROW_UP)
        next = (current - 1 + items.length) % items.length;
      else if (event.key === KEY.HOME) next = 0;
      else if (event.key === KEY.END) next = items.length - 1;

      if (next !== null) {
        event.preventDefault();
        items[next].focus();
      }
    };

    return (
      <div
        className={classNames("context_menu", contextMenuVisible && "visible")}
        role="menu"
        aria-orientation="vertical"
        ref={innerRef}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    );
  },
);
