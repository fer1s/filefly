import { useEffect, useRef, useState } from 'react'

import { useStateContext } from '../context/StateContext'
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu'
import DetailsPopup from '../components/DetailsPopup'
import { openFile, openInTerminal } from '../api'
import { AcceptedPreviewFormats } from '../constants'
import { DirEntryItem } from '../components/DirEntry'

import { IoOpenOutline, IoCopyOutline, IoInformation } from 'react-icons/io5'
import { CgTerminal } from 'react-icons/cg'
import { MdOutlineDriveFileRenameOutline, MdDeleteOutline, MdOutlineContentCut, MdOutlinePreview } from 'react-icons/md'

import '../styles/pages/Directory.scss'
import Preview from '../components/Preview'

const Directory = () => {
   const { dirContent, setPath, view } = useStateContext()

   const [detailsPopupVisible, setDetailsPopupVisible] = useState<boolean>(false)
   const [highlitedElementID, setHighlitedElementID] = useState('')
   const [highlitedElementType, setHighlitedElementType] = useState<'file' | 'dir' | 'none'>('none')

   const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false)
   const [contextMenuElementID, setContextMenuElementID] = useState('')
   const [contextMenuElementType, setContextMenuElementType] = useState<'file' | 'dir' | 'none'>('none')

   const [previewVisible, setPreviewVisible] = useState<boolean>(false)
   const [previewFileType, setPreviewFileType] = useState<string>('')
   const [previewFilePath, setPreviewFilePath] = useState<string>('')

   const contextMenuRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
      const handleCloseContextMenu = (e: MouseEvent) => {
         if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenuVisible(false)
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

      setContextMenuVisible(false)
   }

   const handleOpenFile = () => {
      if (contextMenuElementType === 'file') openFile(contextMenuElementID)
      else if (contextMenuElementType === 'dir') setPath(contextMenuElementID)
      else console.error('An error occured while handling the Open_File event, See the defenition of the function "handleOpenFile()" for more information in Directory.tsx')

      setContextMenuVisible(false)
   }

   const handlePreviewFile = () => {
      if (contextMenuElementType !== 'file' && !contextMenuElementID) return

      // Get the file extension
      const fileExtension = contextMenuElementID.split('.').pop()
      if (!fileExtension) return console.error('An error occured while handling the Preview_File event, See the defenition of the function "handlePreviewFile()" for more information in Directory.tsx')

      // Check if the file extension is accepted
      if (!AcceptedPreviewFormats.includes(fileExtension)) return

      setPreviewFileType(fileExtension)
      setPreviewFilePath(contextMenuElementID)
      setPreviewVisible(true)

      setContextMenuVisible(false)
   }

   // useEffect(() => {
   //    if(contextMenuVisible) {
   //       console.log(contextMenuElementID, contextMenuElementType)
   //    }
   // }, [contextMenuVisible, contextMenuElementID, contextMenuElementType])

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
                  <ContextMenuItem text="Open" icon={<IoOpenOutline />} onClick={handleOpenFile} />
                  <ContextMenuItem text="Open in Terminal" icon={<CgTerminal />} onClick={handleOpenInTerminal} />
                  <ContextMenuItem text="Copy" icon={<IoCopyOutline />} />
                  <ContextMenuItem text="Cut" icon={<MdOutlineContentCut />} />
                  <ContextMenuItem text="Rename" icon={<MdOutlineDriveFileRenameOutline />} />
                  <ContextMenuItem text="Delete" icon={<MdDeleteOutline />} />
               </>
            )}

            {contextMenuElementType === 'file' && (
               <>
                  <ContextMenuItem text="Open" icon={<IoOpenOutline />} onClick={handleOpenFile} />
                  {AcceptedPreviewFormats.includes(contextMenuElementID.split('.').pop() || '') && <ContextMenuItem text="Preview" icon={<MdOutlinePreview />} onClick={handlePreviewFile} />}
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
               Path <span>{highlitedElementID.length > 40 ? `${highlitedElementID.slice(0, 40)}...` : highlitedElementID || '?'}</span>
            </h3>
            {highlitedElementType === 'file' && (
               <h3>
                  Extension <span>{highlitedElementID.split('.').pop() || '?'}</span>
               </h3>
            )}
         </DetailsPopup>

         <Preview fileType={previewFileType} filePath={previewFilePath} previewVisible={previewVisible} setPreviewVisible={setPreviewVisible} />
      </div>
   )
}

export default Directory
