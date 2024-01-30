import { useEffect, useRef } from 'react'

import { useStateContext } from '../context/StateContext'
import { DirEntry } from '../types'

import { ContextMenu, ContextMenuItem } from '../components/ContextMenu'

import { FaFolder, FaFile } from 'react-icons/fa6'

import { IoOpenOutline, IoCopyOutline, IoInformation } from 'react-icons/io5'
import { CgTerminal, CgToolbox } from 'react-icons/cg'
import { MdOutlineDriveFileRenameOutline, MdDeleteOutline, MdOutlineContentCut } from 'react-icons/md'

import '../styles/pages/Directory.scss'

const Directory = () => {
   const { dirContent, setPath } = useStateContext()

   const contextMenuRef = useRef<HTMLDivElement>(null)
   useEffect(() => {
      const handleCloseContextMenu = (e: MouseEvent) => {
         if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
            contextMenuRef.current.classList.add('hidden')
         }
      }

      document.addEventListener('click', handleCloseContextMenu)

      return () => {
         document.removeEventListener('click', handleCloseContextMenu)
      }
   }, [contextMenuRef])

   return (
      <div className="directory_page">
         <div className="grid">
            {dirContent.map((entry) => (
               <DirEntryItem key={`${entry.name}#${entry.path}`} entry={entry} setPath={setPath} contextMenuRef={contextMenuRef} />
            ))}
         </div>

         <ContextMenu ref={contextMenuRef}>
            <ContextMenuItem text="Open" icon={<IoOpenOutline />} />
            <ContextMenuItem text="Open in Terminal" icon={<CgTerminal />} />
            <ContextMenuItem text="Copy" icon={<IoCopyOutline />} />
            <ContextMenuItem text="Cut" icon={<MdOutlineContentCut />} />
            <ContextMenuItem text="Rename" icon={<MdOutlineDriveFileRenameOutline />} />
            <ContextMenuItem text="Delete" icon={<MdDeleteOutline />} />
            <ContextMenuItem isSeparator />
            <ContextMenuItem text="Properties" icon={<IoInformation />} />
            {/* <ContextMenuItem isSeparator />
            <ContextMenuItem text="DevTools" icon={<CgToolbox />} /> */}
         </ContextMenu>
      </div>
   )
}

export default Directory

type DirEntryItemProps = {
   entry: DirEntry
   setPath: (path: string) => void
   contextMenuRef: React.RefObject<HTMLDivElement>
}

// forwards ref to ContextMenu
const DirEntryItem = ({ entry, setPath, contextMenuRef }: DirEntryItemProps) => {
   const itemRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
      const handleContextMenu = (e: MouseEvent) => {
         e.preventDefault()

         if (itemRef.current && contextMenuRef.current) {
            if (itemRef.current.contains(e.target as Node)) {
               contextMenuRef.current.classList.remove('hidden')
               contextMenuRef.current.style.left = `${e.clientX}px`
               contextMenuRef.current.style.top = `${e.clientY}px`
            } else {
               contextMenuRef.current.classList.add('hidden')
            }
         }
      }

      // Attach the event listener to the individual item
      itemRef.current?.addEventListener('contextmenu', handleContextMenu)

      return () => {
         itemRef.current?.removeEventListener('contextmenu', handleContextMenu)
      }
   }, [contextMenuRef])

   const navigateToPath = () => {
      if (entry.metadata.isDir) {
         setPath(entry.path)
      }
   }

   // split extension from name
   let name = entry.name
   let extension = ''
   if (entry.metadata.isFile) {
      let parts = name.split('.')
      extension = parts[parts.length - 1]
      name = parts.slice(0, parts.length - 1).join('.')
   }

   return (
      <div className="dir_entry_item" onDoubleClick={navigateToPath} ref={itemRef}>
         {extension && name && <div className="extension">{extension}</div>}
         {entry.metadata.isDir ? <FaFolder /> : <FaFile />}
         <div className="dir_entry_info">
            <h3>
               {
                  // cut off if too long
                  name.length > 9 ? name.substring(0, 9) + '...' : name
               }
            </h3>
         </div>
      </div>
   )
}
