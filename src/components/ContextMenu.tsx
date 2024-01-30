import { RefObject, ReactNode, forwardRef } from 'react'
import '../styles/components/ContextMenu.scss'


// ContextMenu
interface ContextMenuProps {
    ref: RefObject<HTMLDivElement>
    children: ReactNode
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(({ children }, ref) => {
  return (
    <div className="context_menu " ref={ref}>
      {children}
    </div>
  )
})

// ContextMenuItem
interface ContextMenuItemProps {
    isSeparator?: boolean
    onClick?: () => void
    icon?: ReactNode
    text?: string
}

export const ContextMenuItem = ({ isSeparator, onClick, text, icon }: ContextMenuItemProps) => {
    isSeparator = isSeparator || false

    return isSeparator ? (
        <div className="context_menu_item separator"></div>
    ) : (
        <button className="context_menu_item ctx_button" onClick={onClick}>
            {icon}
            {text}
        </button>
    )
}