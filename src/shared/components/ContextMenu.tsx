import { ReactNode, forwardRef } from "react";
import "../../styles/components/ContextMenu.css";

// ContextMenu
interface ContextMenuProps {
  children: ReactNode;
  contextMenuVisible: boolean;
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ children, contextMenuVisible }, ref) => {
    return (
      <div
        className={`context_menu${contextMenuVisible ? " visible" : ""}`}
        ref={ref}
      >
        {children}
      </div>
    );
  },
);

// ContextMenuItem
interface ContextMenuItemProps {
  isSeparator?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  text?: string;
  disabled?: boolean;
}

export const ContextMenuItem = ({
  isSeparator,
  onClick,
  text,
  icon,
  disabled,
}: ContextMenuItemProps) => {
  isSeparator = isSeparator || false;

  // Default to disabled when there is no handler; an explicit `disabled` prop overrides.
  const isDisabled = disabled ?? !onClick;

  return isSeparator ? (
    <div className="context_menu_item separator"></div>
  ) : (
    <button
      className="context_menu_item ctx_button"
      onClick={onClick}
      disabled={isDisabled}
    >
      <span className="ctx_icon">{icon}</span>
      <span className="ctx_text">{text}</span>
    </button>
  );
};
