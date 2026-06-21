import { forwardRef } from "react";
import { classNames } from "@/shared/utils";
import "@/styles/components/ContextMenu.css";

import type { ContextMenuProps } from "./types";

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ children, contextMenuVisible }, ref) => {
    return (
      <div
        className={classNames("context_menu", contextMenuVisible && "visible")}
        ref={ref}
      >
        {children}
      </div>
    );
  },
);
