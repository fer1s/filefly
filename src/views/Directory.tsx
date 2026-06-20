import { useEffect, useMemo, useRef, useState } from 'react'

import { useStateContext } from '../context/StateContext'
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu'
import DetailsPopup from '../components/DetailsPopup'
import { openFile, openInTerminal, deleteEntry, copyEntry, moveEntry, renameEntry } from '../lib/services/api'
import { notify } from '../lib/toast'
import { ask } from '@tauri-apps/plugin-dialog'
import { AcceptedPreviewFormats } from '../lib/constants'
import { DirEntryItem } from '../components/DirEntry'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare, faCircleInfo, faCopy, faEye, faFilePen, faPaste, faScissors, faTerminal, faTrash } from '@fortawesome/free-solid-svg-icons'

import '../styles/pages/Directory.css'
import Preview from '../components/Preview'
import Properties from '../components/Properties'
import { DirEntry } from '../lib/models'

const Directory = () => {
   const { dirContent, path, setPath, view, search, refreshDir } = useStateContext()

   // Internal clipboard for copy/cut, pasted via the empty-area context menu.
   const [clipboard, setClipboard] = useState<{ paths: string[]; mode: 'copy' | 'cut' } | null>(null)

   // Path of the entry currently being renamed inline (empty when none).
   const [renamingID, setRenamingID] = useState('')

   // Properties modal.
   const [propertiesEntry, setPropertiesEntry] = useState<DirEntry | null>(null)
   const [propertiesVisible, setPropertiesVisible] = useState(false)

   // Entries visible after applying the sidebar search filter.
   const filtered = useMemo(() => (search ? dirContent.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) : dirContent), [dirContent, search])

   const [selectedIDs, setSelectedIDs] = useState<string[]>([])

   // Single click replaces the selection; Ctrl (or Cmd on macOS) + click toggles the item in the selection.
   const handleSelect = (id: string, e: React.MouseEvent) => {
      const additive = e.ctrlKey || e.metaKey
      setSelectedIDs((prev) => (additive ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id]))
   }

   const [detailsPopupVisible, setDetailsPopupVisible] = useState<boolean>(false)
   const [highlitedElementID, setHighlitedElementID] = useState('')
   const [highlitedElementType, setHighlitedElementType] = useState<'file' | 'dir' | 'none'>('none')

   const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false)
   const [contextMenuElementID, setContextMenuElementID] = useState('')
   const [contextMenuElementType, setContextMenuElementType] = useState<'file' | 'dir' | 'none'>('none')

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

   const contextMenuRef = useRef<HTMLDivElement>(null)

   // Type-to-find buffer and its reset timer.
   const searchBufferRef = useRef('')
   const searchTimerRef = useRef<number | null>(null)

   useEffect(() => {
      const handleCloseContextMenu = (e: MouseEvent) => {
         if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenuVisible(false)
      }

      document.addEventListener('click', handleCloseContextMenu)

      return () => {
         document.removeEventListener('click', handleCloseContextMenu)
      }
   }, [contextMenuRef])

   // Keyboard navigation: arrows move a cursor through the entries (and select it), Enter opens, Escape clears.
   useEffect(() => {
      // Skip when typing in the path bar or any other text field.
      const isTypingTarget = (el: EventTarget | null) => {
         const t = el as HTMLElement | null
         return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
      }

      // Number of items in the first grid row, used as the vertical step.
      const columns = () => {
         const items = Array.from(document.querySelectorAll<HTMLElement>('.directory_page .grid .dir_entry_item'))
         if (!items.length) return 1
         const top = items[0].offsetTop
         let cols = 0
         for (const it of items) {
            if (it.offsetTop === top) cols++
            else break
         }
         return cols || 1
      }

      // Move the cursor by delta relative to the last selected entry and select that single entry.
      const move = (delta: number) =>
         setSelectedIDs((prev) => {
            if (!filtered.length) return prev
            const current = prev.length ? filtered.findIndex((e) => e.path === prev[prev.length - 1]) : -1
            const next = Math.max(0, Math.min(filtered.length - 1, current < 0 ? 0 : current + delta))
            return [filtered[next].path]
         })

      // Open the last selected entry (folder navigates, file opens).
      const open = () =>
         setSelectedIDs((prev) => {
            const entry = prev.length ? filtered.find((e) => e.path === prev[prev.length - 1]) : undefined
            if (entry) entry.metadata.isDir ? setPath(entry.path) : openFile(entry.path)
            return prev
         })

      // Type-to-find: append the typed char to a buffer and select the first matching entry.
      // A single-char buffer starts the search after the current item so repeated presses cycle matches.
      const typeahead = (char: string) => {
         if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
         searchBufferRef.current += char.toLowerCase()
         searchTimerRef.current = window.setTimeout(() => (searchBufferRef.current = ''), 700)

         const buf = searchBufferRef.current
         setSelectedIDs((prev) => {
            if (!filtered.length) return prev
            const current = prev.length ? filtered.findIndex((e) => e.path === prev[prev.length - 1]) : -1
            const start = buf.length === 1 ? current + 1 : 0
            for (let i = 0; i < filtered.length; i++) {
               const entry = filtered[(start + i) % filtered.length]
               if (entry.name.toLowerCase().startsWith(buf)) return [entry.path]
            }
            return prev
         })
      }

      const handleKeyDown = (e: KeyboardEvent) => {
         if (isTypingTarget(e.target)) return

         // While the preview is open it owns the keyboard (arrows navigate, Escape closes).
         if (previewVisible) return

         // Printable single characters drive the type-to-find search.
         if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            typeahead(e.key)
            return
         }

         switch (e.key) {
            case 'Escape':
               setSelectedIDs([])
               break
            case 'ArrowRight':
               e.preventDefault()
               move(1)
               break
            case 'ArrowLeft':
               e.preventDefault()
               move(-1)
               break
            case 'ArrowDown':
               e.preventDefault()
               move(view === 'grid' ? columns() : 1)
               break
            case 'ArrowUp':
               e.preventDefault()
               move(view === 'grid' ? -columns() : -1)
               break
            case 'Enter':
               e.preventDefault()
               open()
               break
         }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => {
         document.removeEventListener('keydown', handleKeyDown)
         if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      }
   }, [filtered, view, previewVisible])

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
            await deleteEntry(target)
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
            if (clipboard.mode === 'copy') await copyEntry(source, path)
            else await moveEntry(source, path)
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
         await renameEntry(targetPath, newName)
      } catch (err) {
         notify('Could not rename: ' + err, 'error')
      }
      refreshDir()
   }

   // Keyboard shortcuts for clipboard actions (Cmd/Ctrl + C/X/V, Cmd/Ctrl + Backspace/Delete).
   // They act on the current selection. Modifier combos are ignored by type-to-find, so no conflict.
   useEffect(() => {
      const handleShortcut = (e: KeyboardEvent) => {
         const target = e.target as HTMLElement | null
         if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
         if (previewVisible) return

         const mod = e.metaKey || e.ctrlKey
         if (!mod) return

         switch (e.key) {
            case 'c':
               e.preventDefault()
               copyTargets(selectedIDs)
               break
            case 'x':
               e.preventDefault()
               cutTargets(selectedIDs)
               break
            case 'v':
               e.preventDefault()
               pasteIntoCurrent()
               break
            case 'Backspace':
            case 'Delete':
               e.preventDefault()
               deleteTargets(selectedIDs)
               break
         }
      }

      document.addEventListener('keydown', handleShortcut)
      return () => document.removeEventListener('keydown', handleShortcut)
   }, [selectedIDs, clipboard, path, previewVisible])

   // Right-click on empty space opens a menu with Paste (item clicks are handled by each entry).
   const handleEmptyContextMenu = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.dir_entry_item')) return
      e.preventDefault()

      setContextMenuElementID('')
      setContextMenuElementType('none')
      if (contextMenuRef.current) {
         contextMenuRef.current.style.left = `${e.clientX}px`
         contextMenuRef.current.style.top = `${e.clientY}px`
      }
      setContextMenuVisible(true)
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
