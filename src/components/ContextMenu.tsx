import { RefObject, ReactNode, forwardRef } from 'react'
import { motion } from 'framer-motion'
import '../styles/components/ContextMenu.scss'

const contextMenuVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
  },

}

// ContextMenu
interface ContextMenuProps {
    ref: RefObject<HTMLDivElement>
    children: ReactNode
    contextMenuVisible: boolean
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(({ children, contextMenuVisible }, ref) => {
    return (
        <motion.div
            className="context_menu"
            ref={ref}

            variants={contextMenuVariants}
            animate={contextMenuVisible ? 'visible' : 'hidden'}

            initial="hidden"
            exit="hidden"

            transition={{ duration: 0.2 }}
        >
            {children}
        </motion.div>
    )
})

// ContextMenuItem
interface ContextMenuItemProps {
    isSeparator ?: boolean
    onClick     ?: () => void
    icon        ?: ReactNode
    text        ?: string
}

export const ContextMenuItem = ({ isSeparator, onClick, text, icon }: ContextMenuItemProps) => {
    isSeparator = isSeparator || false

    return isSeparator ? 
        <div className="context_menu_item separator"></div>
    :
        <button className="context_menu_item ctx_button" onClick={onClick}>
            {icon}
            {text}
        </button>
}