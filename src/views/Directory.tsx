import { useMemo, useState } from 'react'

import { useStateContext } from '../shared/providers/StateProvider'
import { ContextMenu, ContextMenuItem } from '../shared/components/ContextMenu'
import DetailsPopup from '../shared/components/DetailsPopup'
import { notify } from '../shared/toast'
import { ask } from '@tauri-apps/plugin-dialog'
import { AcceptedPreviewFormats } from '../shared/constants'
import { DirEntryItem } from '../components/DirEntry'
import { useSelection } from '../hooks/useSelection'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { useClipboardShortcuts } from '../hooks/useClipboardShortcuts'
import { useContextMenu } from '../hooks/useContextMenu'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare, faCircleInfo, faCopy, faEye, faFilePen, faPaste, faScissors, faTerminal, faTrash } from '@fortawesome/free-solid-svg-icons'

import '../styles/views/Directory.css'
import Preview from '../components/Preview'
import Properties from '../components/Properties'
import { DirEntry } from '../shared/models'

const Directory = () => {
   const { fs, dirContent, path, setPath, view, search, refreshDir } = useStateContext()

   // Internal clipboard for copy/cut, pasted via the empty-area context menu.
   const [clipboard, setClipboard] = useState<{ paths: string[]; mode: 'copy' | 'cut' } | null>(null)

   // Path of the entry currently being renamed inline (empty when none).
   const [renamingID, setRenamingID] = useState('')

   // Properties modal.
   const [propertiesEntry, setPropertiesEntry] = useState<DirEntry | null>(null)
   const [propertiesVisible, setPropertiesVisible] = useState(false)

   // Entries visible after applying the sidebar search filter.
   const filtered = useMemo(() => (search ? dirContent.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) : dirContent), [dirContent, search])

   const { selectedIDs, setSelectedIDs, handleSelect } = useSelection()

   const [detailsPopupVisible, setDetailsPopupVisible] = useState<boolean>(false)
   const [highlitedElementID, setHighlitedElementID] = useState('')
   const [highlitedElementType, setHighlitedElementType] = useState<'file' | 'dir' | 'none'>('none')

   const {
      ref: contextMenuRef,
      visible: contextMenuVisible,
      setVisible: setContextMenuVisible,
      elementID: contextMenuElementID,
      setElementID: setContextMenuElementID,
      elementType: contextMenuElementType,
      setElementType: setContextMenuElementType,
      openAt: openContextMenuAt,
   } = useContextMenu()

   const [previewVisible, setPreviewVisible] = useState<boolean>(false)
   const [previewIndex, setPreviewIndex] = useState<number>(-1)

   // Files in the current (filtered) view that can be previewed, used for prev/next navigation.
   const previewables = useMemo(
      () => filtered.filter((e) => e.metadata.isFile && AcceptedPreviewFormats.includes((e.name.split('.').pop() || '').toLowerCase())),
      [filtered]
   )

   const previewEntry = previewIndex >= 0 ? previewables[previewIndex] : undefined
   const previewFilePath = previewEntry?.path ?? ''
   const previewFileType = previewEntry ? (previewEntry.name.split('.').pop() || '').toLowerCase() : ''

   const previewPrev = () => setPreviewIndex((i) => (i > 0 ? i - 1 : i))
   const previewNext = () => setPreviewIndex((i) => (i < previewables.length - 1 ? i + 1 : i))

   useKeyboardNav({
      items: filtered,
      view,
      enabled: !previewVisible,
      setSelectedIDs,
      onOpen: (entry) => (entry.metadata.isDir ? setPath(entry.path) : fs.open(entry.path)),
   })

   const handleOpenInTerminal = () => {
      if (contextMenuElementType === 'dir') fs.openInTerminal(contextMenuElementID)
      else if (contextMenuElementType === 'file') fs.openInTerminal(contextMenuElementID.split('/').slice(0, -1).join('/'))
      else console.error('An error occured while handling the Open_In_Terminal event, See the defenition of the function "handleOpenInTerminal()" for more information in Directory.tsx')

      setContextMenuVisible(false)
   }

   const handleOpenFile = () => {
      if (contextMenuElementType === 'file') fs.open(contextMenuElementID)
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

      // Locate the file among the previewable entries so prev/next can navigate from here.
      const index = previewables.findIndex((e) => e.path === contextMenuElementID)
      if (index < 0) return

      setPreviewIndex(index)
      setPreviewVisible(true)

      setContextMenuVisible(false)
   }

   // The entries a context-menu action applies to: the whole selection if the clicked item is part of it,
   // otherwise just the clicked item.
   const actionTargets = () => (selectedIDs.includes(contextMenuElementID) ? selectedIDs : [contextMenuElementID])

   // Core operations on a list of paths, shared by the context menu and the keyboard shortcuts.
   const copyTargets = (targets: string[]) => {
      if (targets.length && targets[0]) setClipboard({ paths: targets, mode: 'copy' })
   }

   const cutTargets = (targets: string[]) => {
      if (targets.length && targets[0]) setClipboard({ paths: targets, mode: 'cut' })
   }

   const deleteTargets = async (targets: string[]) => {
      if (!targets.length || !targets[0]) return

      const label = targets.length === 1 ? `"${targets[0].split('/').pop()}"` : `${targets.length} items`
      const confirmed = await ask(`Move ${label} to the Trash?`, { title: 'Delete', kind: 'warning' })
      if (!confirmed) return

      for (const target of targets) {
         try {
            await fs.trash(target)
         } catch (err) {
            notify('Could not delete ' + (target.split('/').pop() || target) + ': ' + err, 'error')
         }
      }

      setSelectedIDs([])
      refreshDir()
   }

   const pasteIntoCurrent = async () => {
      if (!clipboard || path === '') return

      for (const source of clipboard.paths) {
         try {
            if (clipboard.mode === 'copy') await fs.copy(source, path)
            else await fs.move(source, path)
         } catch (err) {
            notify('Could not paste ' + (source.split('/').pop() || source) + ': ' + err, 'error')
         }
      }

      if (clipboard.mode === 'cut') setClipboard(null)
      setSelectedIDs([])
      refreshDir()
   }

   // Context-menu wrappers: act on the clicked item/selection, then close the menu.
   const handleCopy = () => {
      copyTargets(actionTargets())
      setContextMenuVisible(false)
   }

   const handleCut = () => {
      cutTargets(actionTargets())
      setContextMenuVisible(false)
   }

   const handleDelete = async () => {
      const targets = actionTargets()
      setContextMenuVisible(false)
      await deleteTargets(targets)
   }

   const handlePaste = async () => {
      setContextMenuVisible(false)
      await pasteIntoCurrent()
   }

   // Start inline rename on the clicked entry.
   const handleRename = () => {
      setRenamingID(contextMenuElementID)
      setContextMenuVisible(false)
   }

   const handleProperties = () => {
      setPropertiesEntry(dirContent.find((e) => e.path === contextMenuElementID) || null)
      setPropertiesVisible(true)
      setContextMenuVisible(false)
   }

   const handleRenameSubmit = async (targetPath: string, newName: string) => {
      setRenamingID('')
      try {
         await fs.rename(targetPath, newName)
      } catch (err) {
         notify('Could not rename: ' + err, 'error')
      }
      refreshDir()
   }

   useClipboardShortcuts({
      enabled: !previewVisible,
      selectedIDs,
      onCopy: copyTargets,
      onCut: cutTargets,
      onPaste: pasteIntoCurrent,
      onDelete: deleteTargets,
   })

   // Right-click on empty space opens a menu with Paste (item clicks are handled by each entry).
   const handleEmptyContextMenu = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.dir_entry_item')) return
      e.preventDefault()
      openContextMenuAt(e.clientX, e.clientY, '', 'none')
   }

   // useEffect(() => {
   //    if(contextMenuVisible) {
   //       console.log(contextMenuElementID, contextMenuElementType)
   //    }
   // }, [contextMenuVisible, contextMenuElementID, contextMenuElementType])

   return (
      <div className="directory_page" onClick={(e) => !(e.target as HTMLElement).closest('.dir_entry_item') && setSelectedIDs([])} onContextMenu={handleEmptyContextMenu}>
         <div className={view == 'list' ? 'list' : 'grid'}>
            {filtered.map((entry) => (
               <DirEntryItem
                  key={`${entry.name}#${entry.path}`}
                  entry={entry}
                  setPath={setPath}
                  contextMenuRef={contextMenuRef}
                  id={entry.path}
                  view={view == 'list' ? 'list' : 'grid'}
                  selected={selectedIDs.includes(entry.path)}
                  onSelect={(e) => handleSelect(entry.path, e)}
                  renaming={renamingID === entry.path}
                  onRename={(newName) => handleRenameSubmit(entry.path, newName)}
                  onCancelRename={() => setRenamingID('')}
                  setHighlitedElementID={setHighlitedElementID}
                  setHighlitedElementType={setHighlitedElementType}
                  setDetailsPopupVisible={setDetailsPopupVisible}
                  setContextMenuVisible={setContextMenuVisible}
                  setContextMenuElementID={setContextMenuElementID}
                  setContextMenuElementType={setContextMenuElementType}
               />
            ))}
         </div>

         {search && filtered.length === 0 && <p className="no_results">No results for "{search}"</p>}

         <ContextMenu contextMenuVisible={contextMenuVisible} ref={contextMenuRef}>
            {contextMenuElementType === 'none' && (
               <ContextMenuItem text="Paste" icon={<FontAwesomeIcon icon={faPaste} />} onClick={clipboard ? handlePaste : undefined} />
            )}

            {contextMenuElementType === 'dir' && (
               <>
                  <ContextMenuItem text="Open" icon={<FontAwesomeIcon icon={faArrowUpRightFromSquare} />} onClick={handleOpenFile} />
                  <ContextMenuItem text="Open in Terminal" icon={<FontAwesomeIcon icon={faTerminal} />} onClick={handleOpenInTerminal} />
                  <ContextMenuItem text="Copy" icon={<FontAwesomeIcon icon={faCopy} />} onClick={handleCopy} />
                  <ContextMenuItem text="Cut" icon={<FontAwesomeIcon icon={faScissors} />} onClick={handleCut} />
                  <ContextMenuItem text="Rename" icon={<FontAwesomeIcon icon={faFilePen} />} onClick={handleRename} />
                  <ContextMenuItem text="Delete" icon={<FontAwesomeIcon icon={faTrash} />} onClick={handleDelete} />
               </>
            )}

            {contextMenuElementType === 'file' && (
               <>
                  <ContextMenuItem text="Open" icon={<FontAwesomeIcon icon={faArrowUpRightFromSquare} />} onClick={handleOpenFile} />
                  {AcceptedPreviewFormats.includes(contextMenuElementID.split('.').pop() || '') && <ContextMenuItem text="Preview" icon={<FontAwesomeIcon icon={faEye} />} onClick={handlePreviewFile} />}
                  <ContextMenuItem text="Copy" icon={<FontAwesomeIcon icon={faCopy} />} onClick={handleCopy} />
                  <ContextMenuItem text="Cut" icon={<FontAwesomeIcon icon={faScissors} />} onClick={handleCut} />
                  <ContextMenuItem text="Rename" icon={<FontAwesomeIcon icon={faFilePen} />} onClick={handleRename} />
                  <ContextMenuItem text="Delete" icon={<FontAwesomeIcon icon={faTrash} />} onClick={handleDelete} />
               </>
            )}

            {contextMenuElementType !== 'none' && (
               <>
                  <ContextMenuItem isSeparator />
                  <ContextMenuItem text="Properties" icon={<FontAwesomeIcon icon={faCircleInfo} />} onClick={handleProperties} />
               </>
            )}
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

         <Preview
            fileType={previewFileType}
            filePath={previewFilePath}
            previewVisible={previewVisible}
            setPreviewVisible={setPreviewVisible}
            onPrev={previewPrev}
            onNext={previewNext}
            hasPrev={previewIndex > 0}
            hasNext={previewIndex < previewables.length - 1}
         />

         <Properties entry={propertiesEntry} visible={propertiesVisible} onClose={() => setPropertiesVisible(false)} />
      </div>
   )
}

export default Directory
