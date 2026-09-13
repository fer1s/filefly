import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ContextMenu as SitoContextMenu,
  type ContextMenuPosition,
} from "@sito/ui";

import { t } from "@/lang";
import "@/styles/components/ContextMenu.css";

import { CONTEXT_MENU_INITIAL_POSITION, MENU_ITEM_SELECTOR } from "./constants";
import type { ContextMenuProps } from "./types";

const ignoreDismissal = () => undefined;

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ children, contextMenuVisible }, ref) => {
    // Existing menu hooks position through a ref before opening. Keep a mounted bridge while
    // closed, then expose the shared menu element for containment and viewport measurements.
    const positionRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<ContextMenuPosition>(
      CONTEXT_MENU_INITIAL_POSITION,
    );
    useImperativeHandle(
      ref,
      () =>
        (contextMenuVisible
          ? menuRef.current
          : positionRef.current) as HTMLDivElement,
      [contextMenuVisible],
    );

    useLayoutEffect(() => {
      if (!contextMenuVisible) return;
      // Transfer the coordinates written by the legacy hook into the controlled shared primitive.
      setPosition({
        x:
          Number.parseFloat(positionRef.current?.style.left ?? "") ||
          CONTEXT_MENU_INITIAL_POSITION.x,
        y:
          Number.parseFloat(positionRef.current?.style.top ?? "") ||
          CONTEXT_MENU_INITIAL_POSITION.y,
      });
    }, [contextMenuVisible]);

    useEffect(() => {
      if (!contextMenuVisible) return;

      // Selecting an entry from its context-menu gesture focuses that row in a passive effect.
      // Reclaim focus after those selection effects so arrow keys stay inside the open menu.
      const menu = menuRef.current;
      const firstItem = menu?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR);
      (firstItem ?? menu)?.focus();
    }, [contextMenuVisible]);

    return (
      <>
        <div ref={positionRef} hidden aria-hidden="true" />
        <SitoContextMenu
          ref={menuRef}
          open={contextMenuVisible}
          position={position}
          onClose={ignoreDismissal}
          ariaLabel={t.contextMenu.label}
          // File Browser keeps dismissal in its MENU hotkey scope and existing outside-click hook.
          closeOnEscape={false}
          closeOnTab={false}
          closeOnPointerDownOutside={false}
          className="context_menu visible"
        >
          {children}
        </SitoContextMenu>
      </>
    );
  },
);
