import { useEffect, useRef } from 'react'
// import moment from 'moment'
import { convertFileSrc } from '@tauri-apps/api/tauri'

import { DirEntry } from '../types'
import { navigateToPath, formatBytes } from '../utils'

import { FaFile, FaFolder } from 'react-icons/fa'

type DirEntryItemProps = {
   entry: DirEntry
   setPath: (path: string) => void
   view: 'grid' | 'list'

   setHighlitedElementID: (id: string) => void
   setHighlitedElementType: (type: 'file' | 'dir' | 'none') => void
   setDetailsPopupVisible: (visible: boolean) => void

   setContextMenuVisible: (visible: boolean) => void
   setContextMenuElementID: (id: string) => void
   setContextMenuElementType: (type: 'file' | 'dir' | 'none') => void

   contextMenuRef: React.RefObject<HTMLDivElement>
   id: string
}

const DirEntryItem = ({
   entry,
   setPath,
   contextMenuRef,
   id,
   view,

   setHighlitedElementID,
   setHighlitedElementType,
   setDetailsPopupVisible,

   setContextMenuVisible,
   setContextMenuElementID,
   setContextMenuElementType,
}: DirEntryItemProps) => {
   const itemRef = useRef<HTMLDivElement>(null)

   // const [modified, setModified] = useState<string>('')

   // handle context menu
   useEffect(() => {
      const handleContextMenu = (e: MouseEvent) => {
         e.preventDefault()

         if (itemRef.current && contextMenuRef.current) {
            if (itemRef.current.contains(e.target as Node)) {
               setContextMenuElementID(itemRef.current.id)

               if (entry.metadata.isDir) {
                  setContextMenuElementType('dir')
               } else if (entry.metadata.isFile) {
                  setContextMenuElementType('file')
               } else {
                  setContextMenuElementType('none')
               }

               contextMenuRef.current.style.left = `${e.clientX}px`
               contextMenuRef.current.style.top = `${e.clientY}px`

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

   // useEffect(() => {
   //    if (entry.metadata.modified.secs_since_epoch) {
   //       let formatted = formatDate(entry.metadata.modified.secs_since_epoch)
   //       formatted = moment(modified).fromNow()

   //       if (formatted === 'Invalid date') return

   //       setModified(formatted)
   //    }
   // }, [entry])

   return (
      <div
         className="dir_entry_item"
         id={id}
         onDoubleClick={() => {
            navigateToPath(entry, setPath)
         }}
         ref={itemRef}
      >
         {view === 'grid' ? (
            <>
               {extension && name && <div className="extension">{extension}</div>}
               {extension === 'png' || extension === 'jpg' || extension === 'jpeg' ? <img src={convertFileSrc(entry.path)} /> : entry.metadata.isDir ? <FaFolder /> : <FaFile />}
               <div className="dir_entry_info">
                  <h3>{name ? (name.length > 9 ? name.substring(0, 9) + '...' : name) : extension}</h3>
               </div>
            </>
         ) : (
            <>
               <div className="icon">
                  {extension === 'png' || extension === 'jpg' || extension === 'jpeg' ? <img src={convertFileSrc(entry.path)} /> : entry.metadata.isDir ? <FaFolder /> : <FaFile />}
               </div>
               <div className="name">
                  <h3>{name ? (name.length > 25 ? name.substring(0, 25) + '...' : name) : '.'+extension}</h3>
               </div>
               <div className="size">
                  {entry.size > 0 && <h3>{formatBytes(entry.size)}</h3>}
               </div>
               <div className="extension">{extension && name && <h3>{extension}</h3>}</div>
            </>
         )}
      </div>
   )
}

export default DirEntryItem
