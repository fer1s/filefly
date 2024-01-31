import { useEffect, useRef } from 'react'
// import moment from 'moment'
import { convertFileSrc } from '@tauri-apps/api/tauri'

import { DirEntry } from '../types'
import { navigateToPath, formatBytes } from '../utils'

import { FaFile, FaFolder } from 'react-icons/fa'
import { openFile } from '../api'

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
                if (!itemRef.current.contains(e.target as Node)) return setContextMenuVisible(false);
                
                setContextMenuElementID(itemRef.current.id)

                if (entry.metadata.isDir) setContextMenuElementType('dir')
                else if (entry.metadata.isFile) setContextMenuElementType('file')
                else setContextMenuElementType('none')

                contextMenuRef.current.style.left = `${e.clientX}px`
                contextMenuRef.current.style.top = `${e.clientY}px`

                setContextMenuVisible(true)
            }
        }

        // Attach the event listener to the individual item
        itemRef.current?.addEventListener('contextmenu', handleContextMenu)
        // Remove the event listener from the individual item
        return () => itemRef.current?.removeEventListener('contextmenu', handleContextMenu)
   }, [contextMenuRef])

   // handle details popup
   useEffect(() => {
      let timer: number | null = null

      const handleMouseEnter = () => {
         timer = setTimeout(() => {
            if (!itemRef.current) return;

            setHighlitedElementID(itemRef.current.id)
            if (entry.metadata.isDir) setHighlitedElementType('dir')
            else if (entry.metadata.isFile) setHighlitedElementType('file')
            else setHighlitedElementType('none')

            setTimeout(() => {
               if (!itemRef.current) return;
               setDetailsPopupVisible(true);
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

   // Split extension from the file name
   let name = entry.metadata.isFile ? entry.name.split('.')[0] : entry.name;
   let extension = entry.metadata.isFile ? entry.name.split('.')[entry.name.split('.').length - 1] : ''

   // useEffect(() => {
   //    if (entry.metadata.modified.secs_since_epoch) {
   //       let formatted = formatDate(entry.metadata.modified.secs_since_epoch)
   //       formatted = moment(modified).fromNow()

   //       if (formatted === 'Invalid date') return

   //       setModified(formatted)
   //    }
   // }, [entry])

   const ImageFormats = ['png', 'jpg', 'jpeg', 'webp'];

   return (
      <div
         className="dir_entry_item"
         id={id}
         onDoubleClick={() => entry.metadata.isDir ? navigateToPath(entry, setPath) : openFile(entry.path)}
         ref={itemRef}
      >
         {view === 'grid' ? 
            (
                <>
                    {
                        extension && name && <div className="extension">{extension}</div>
                    }
                    
                    { ImageFormats.includes(extension.toLowerCase().trim()) 
                        ? <img src={convertFileSrc(entry.path)} /> 
                        
                        : entry.metadata.isDir ? <FaFolder /> 
                        : <FaFile />
                    }

                    <div className="dir_entry_info">
                        <h3>{name ? (name.length > 9 ? name.substring(0, 9) + '...' : name) : extension}</h3>
                    </div>
                </>
            )
          : 
            (
                <>
                    <div className="icon">
                            { ImageFormats.includes(extension.toLowerCase().trim()) 
                                ? <img src={convertFileSrc(entry.path)} /> 
                                : entry.metadata.isDir 

                                ? <FaFolder /> 
                                : <FaFile />
                            }
                    </div>
                    <div className='name'>
                        <h3>{name ? (name.length > 25 ? name.substring(0, 25) + '...' : name) : extension}</h3>
                    </div>
                    <div className="size">
                        {entry.size > 0 && <h3>{formatBytes(entry.size)}</h3>}
                    </div>
                    <div className="extension">{extension && name && <h3>{extension}</h3>}</div>
                </>
            )
         }
      </div>
   )
}

export {
    DirEntryItem
}