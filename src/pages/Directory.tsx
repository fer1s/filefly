import { useEffect, useRef, useState } from 'react'

import { useStateContext } from '../context/StateContext'
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu'
import DetailsPopup from '../components/DetailsPopup'
import { openFile, openInTerminal } from '../api'
import { DirEntryItem } from '../components/DirEntry'

import { IoOpenOutline, IoCopyOutline, IoInformation } from 'react-icons/io5'
import { CgTerminal } from 'react-icons/cg'
import { MdOutlineDriveFileRenameOutline, MdDeleteOutline, MdOutlineContentCut } from 'react-icons/md'

import '../styles/pages/Directory.scss'

const Directory = () => {
    const { dirContent, setPath, view } = useStateContext()

    const [detailsPopupVisible, setDetailsPopupVisible] = useState<boolean>(false)
    const [highlitedElementID, setHighlitedElementID] = useState('')
    const [highlitedElementType, setHighlitedElementType] = useState<'file' | 'dir' | 'none'>('none')
 
    const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false)
    const [contextMenuElementID, setContextMenuElementID] = useState('')
    const [contextMenuElementType, setContextMenuElementType] = useState<'file' | 'dir' | 'none'>('none')
 
    const contextMenuRef = useRef<HTMLDivElement>(null)
 
    useEffect(() => {
       const handleCloseContextMenu = (e: MouseEvent) => {
          if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenuVisible(false);
       }
 
       document.addEventListener('click', handleCloseContextMenu)
 
       return () => {
          document.removeEventListener('click', handleCloseContextMenu)
       }
    }, [contextMenuRef])

   const handleOpenInTerminal = () => {
      if (contextMenuElementType === 'dir') openInTerminal(contextMenuElementID)
      else if (contextMenuElementType === 'file') openInTerminal(contextMenuElementID.split('/').slice(0, -1).join('/'))
      else console.error('An error occured while handling the Open_In_Terminal event, See the defenition of the function "handleOpenInTerminal()" for more information in Directory.tsx')

      setContextMenuVisible(false);
   }

   return (
        <div className="directory_page">
            <div className={view == 'list' ? 'list' : 'grid'}>
            {dirContent.map((entry) => (
                <DirEntryItem
                    key={`${entry.name}#${entry.path}`}
                    entry={entry}
                    setPath={setPath}
                    contextMenuRef={contextMenuRef}
                    id={entry.path}
                    view={view == 'list' ? 'list' : 'grid'}
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
                    <ContextMenuItem text="Open in Terminal" icon={<CgTerminal />} onClick={handleOpenInTerminal} />
                    <ContextMenuItem text="Copy" icon={<IoCopyOutline />} />
                    <ContextMenuItem text="Cut" icon={<MdOutlineContentCut />} />
                    <ContextMenuItem text="Rename" icon={<MdOutlineDriveFileRenameOutline />} />
                    <ContextMenuItem text="Delete" icon={<MdDeleteOutline />} />
                </>
            )}

            {contextMenuElementType === 'file' && (
                <>
                    <ContextMenuItem
                        text="Execute"
                        icon={<IoOpenOutline />}
                        onClick={() => {
                            (async ( ) => await openFile(contextMenuElementID))();
                        }}
                    />
                    <ContextMenuItem text="Copy" icon={<IoCopyOutline />} />
                    <ContextMenuItem text="Cut" icon={<MdOutlineContentCut />} />
                    <ContextMenuItem text="Rename" icon={<MdOutlineDriveFileRenameOutline />} />
                    <ContextMenuItem text="Delete" icon={<MdDeleteOutline />} />
                </>
            )}

            <ContextMenuItem isSeparator />
            <ContextMenuItem text="Properties" icon={<IoInformation />} />

            {/* <ContextMenuItem isSeparator />
            <ContextMenuItem text="DevTools" icon={<CgToolbox />} /> */}
            </ContextMenu>

            <DetailsPopup visible={detailsPopupVisible} title="Metadata">
            <h3>
                Type <span>{highlitedElementType === 'dir' ? 'Directory' : highlitedElementType === 'file' ? 'File' : '?'}</span>
            </h3>
            <h3>
                Path <span>{
                    highlitedElementID.length > 40 ? `${highlitedElementID.slice(0, 40)}...` : highlitedElementID
                || '?'}</span>
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
