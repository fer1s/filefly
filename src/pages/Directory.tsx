import { useEffect, useRef, useState } from 'react'

import { useStateContext } from '../context/StateContext'
import { DirEntry } from '../types'

import { ContextMenu, ContextMenuItem } from '../components/ContextMenu'
import DetailsPopup from '../components/DetailsPopup'

import { FaFolder, FaFile } from 'react-icons/fa6'

import { IoOpenOutline, IoCopyOutline, IoInformation } from 'react-icons/io5'
import { CgTerminal } from 'react-icons/cg'
import { MdOutlineDriveFileRenameOutline, MdDeleteOutline, MdOutlineContentCut } from 'react-icons/md'

import '../styles/pages/Directory.scss'

const Directory = () => {
   const { dirContent, setPath } = useStateContext()

   const [detailsPopupVisible, setDetailsPopupVisible] = useState<boolean>(false)
   const [highlitedElementID, setHighlitedElementID] = useState('')
   const [highlitedElementType, setHighlitedElementType] = useState<'file' | 'dir' | 'none'>('none')

   const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false)
   const [contextMenuElementID, setContextMenuElementID] = useState('')
   const [contextMenuElementType, setContextMenuElementType] = useState<'file' | 'dir' | 'none'>('none')

   const contextMenuRef = useRef<HTMLDivElement>(null)
   useEffect(() => {
      const handleCloseContextMenu = (e: MouseEvent) => {
         if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
            setContextMenuVisible(false)
         }
      }

      document.addEventListener('click', handleCloseContextMenu)

      return () => {
         document.removeEventListener('click', handleCloseContextMenu)
      }
   }, [contextMenuRef])

   useEffect(() => {
      if(contextMenuVisible) {
         console.log(contextMenuElementID, contextMenuElementType)
      }
   }, [contextMenuVisible, contextMenuElementID, contextMenuElementType])

   return (
      <div className="directory_page">
         <div className="grid">
            {dirContent.map((entry) => (
               <DirEntryItem
                  key={`${entry.name}#${entry.path}`}
                  entry={entry}
                  setPath={setPath}
                  contextMenuRef={contextMenuRef}
                  id={entry.path}
                  setHighlitedElementID={setHighlitedElementID}
                  setHighlitedElementType={setHighlitedElementType}
                  setDetailsPopupVisible={setDetailsPopupVisible}
                  setContextMenuVisible={setContextMenuVisible}
                  setContextMenuElementID={setContextMenuElementID}
                  setContextMenuElementType={setContextMenuElementType}
               />
            ))}
         </div>

         <ContextMenu contextMenuVisible={contextMenuVisible} ref={contextMenuRef}>
            {contextMenuElementType === 'dir' && (
               <>
                  <ContextMenuItem
                     text="Open"
                     icon={<IoOpenOutline />}
                     onClick={() => {
                        console.log('open', contextMenuElementID, contextMenuElementType)
                     }}
                  />
                  <ContextMenuItem text="Open in Terminal" icon={<CgTerminal />} />
                  <ContextMenuItem text="Copy" icon={<IoCopyOutline />} />
                  <ContextMenuItem text="Cut" icon={<MdOutlineContentCut />} />
                  <ContextMenuItem text="Rename" icon={<MdOutlineDriveFileRenameOutline />} />
                  <ContextMenuItem text="Delete" icon={<MdDeleteOutline />} />
                  <ContextMenuItem isSeparator />
                  <ContextMenuItem text="Properties" icon={<IoInformation />} />
               </>
            )}

            {contextMenuElementType === 'file' && (
               <>
                  <ContextMenuItem
                     text="Execute"
                     icon={<IoOpenOutline />}
                     onClick={() => {
                        console.log('open', contextMenuElementID, contextMenuElementType)
                     }}
                  />
                  <ContextMenuItem text="Copy" icon={<IoCopyOutline />} />
                  <ContextMenuItem text="Cut" icon={<MdOutlineContentCut />} />
                  <ContextMenuItem text="Rename" icon={<MdOutlineDriveFileRenameOutline />} />
                  <ContextMenuItem text="Delete" icon={<MdDeleteOutline />} />
                  <ContextMenuItem isSeparator />
                  <ContextMenuItem text="Properties" icon={<IoInformation />} />
               </>
            )}

            {/* <ContextMenuItem isSeparator />
            <ContextMenuItem text="DevTools" icon={<CgToolbox />} /> */}
         </ContextMenu>

         <DetailsPopup visible={detailsPopupVisible} title="Metadata">
            <h3>
               Type <span>{highlitedElementType === 'dir' ? 'Directory' : highlitedElementType === 'file' ? 'File' : '?'}</span>
            </h3>
            <h3>
               Path <span>{highlitedElementID || '?'}</span>
            </h3>
            {highlitedElementType === 'file' && (
               <h3>
                  Extension <span>{highlitedElementID.split('.').pop() || '?'}</span>
               </h3>
            )}
         </DetailsPopup>
      </div>
   )
}

export default Directory

type DirEntryItemProps = {
   entry: DirEntry
   setPath: (path: string) => void

   setHighlitedElementID: (id: string) => void
   setHighlitedElementType: (type: 'file' | 'dir' | 'none') => void
   setDetailsPopupVisible: (visible: boolean) => void

   setContextMenuVisible: (visible: boolean) => void
   setContextMenuElementID: (id: string) => void
   setContextMenuElementType: (type: 'file' | 'dir' | 'none') => void

   contextMenuRef: React.RefObject<HTMLDivElement>
   id: string
}

// forwards ref to ContextMenu
const DirEntryItem = ({
   entry,
   setPath,
   contextMenuRef,
   id,

   setHighlitedElementID,
   setHighlitedElementType,
   setDetailsPopupVisible,

   setContextMenuVisible,
   setContextMenuElementID,
   setContextMenuElementType,
}: DirEntryItemProps) => {
   const itemRef = useRef<HTMLDivElement>(null)

   // handle context menu
   useEffect(() => {
      const handleContextMenu = (e: MouseEvent) => {
         e.preventDefault()

         if (itemRef.current && contextMenuRef.current) {
            if (itemRef.current.contains(e.target as Node)) {
               // contextMenuRef.current.classList.remove('hidden')
               contextMenuRef.current.style.left = `${e.clientX}px`
               contextMenuRef.current.style.top = `${e.clientY}px`

               // set the id of the element that was clicked
               setContextMenuElementID(itemRef.current.id)
               if (entry.metadata.isDir) {
                  setContextMenuElementType('dir')
               } else if (entry.metadata.isFile) {
                  setContextMenuElementType('file')
               } else {
                  setContextMenuElementType('none')
               }

               setContextMenuVisible(true)
            } else {
               // contextMenuRef.current.classList.add('hidden')
               setContextMenuVisible(false)
            }
         }
      }

      // Attach the event listener to the individual item
      itemRef.current?.addEventListener('contextmenu', handleContextMenu)

      return () => {
         itemRef.current?.removeEventListener('contextmenu', handleContextMenu)
      }
   }, [contextMenuRef])

   // handle details popup
   useEffect(() => {
      let timer: any = null

      const handleMouseEnter = () => {
         timer = setTimeout(() => {
            if (itemRef.current) {
               setHighlitedElementID(itemRef.current.id)
               if (entry.metadata.isDir) {
                  setHighlitedElementType('dir')
               } else if (entry.metadata.isFile) {
                  setHighlitedElementType('file')
               } else {
                  setHighlitedElementType('none')
               }
            }

            setTimeout(() => {
               if (itemRef.current) {
                  setDetailsPopupVisible(true)
               }
            }, 1000)
         }, 1000)
      }

      const handleMouseLeave = () => {
         setDetailsPopupVisible(false)
         if (timer) clearTimeout(timer)
      }

      itemRef.current?.addEventListener('mouseenter', handleMouseEnter)
      itemRef.current?.addEventListener('mouseleave', handleMouseLeave)

      return () => {
         itemRef.current?.removeEventListener('mouseenter', handleMouseEnter)
         itemRef.current?.removeEventListener('mouseleave', handleMouseLeave)
      }
   }, [])

   // split extension from name
   let name = entry.name
   let extension = ''
   if (entry.metadata.isFile) {
      let parts = name.split('.')
      extension = parts[parts.length - 1]
      name = parts.slice(0, parts.length - 1).join('.')
   }

   return (
      <div
         className="dir_entry_item"
         id={id}
         onDoubleClick={() => {
            navigateToPath(entry, setPath)
         }}
         ref={itemRef}
      >
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

const navigateToPath = (entry: DirEntry, setPath: (path: string) => void) => {
   if (entry.metadata.isDir) {
      setPath(entry.path)
   }
}
