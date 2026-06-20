import { useEffect, useMemo, useRef, useState } from 'react'

import { useStateContext } from '../context/StateContext'
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu'
import DetailsPopup from '../components/DetailsPopup'
import { openFile, openInTerminal } from '../api'
import { AcceptedPreviewFormats } from '../constants'
import { DirEntryItem } from '../components/DirEntry'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare, faCircleInfo, faCopy, faEye, faFilePen, faScissors, faTerminal, faTrash } from '@fortawesome/free-solid-svg-icons'

import '../styles/pages/Directory.css'
import Preview from '../components/Preview'

const Directory = () => {
   const { dirContent, setPath, view, search } = useStateContext()

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

   // useEffect(() => {
   //    if(contextMenuVisible) {
   //       console.log(contextMenuElementID, contextMenuElementType)
   //    }
   // }, [contextMenuVisible, contextMenuElementID, contextMenuElementType])

   return (
      <div className="directory_page" onClick={(e) => !(e.target as HTMLElement).closest('.dir_entry_item') && setSelectedIDs([])}>
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
            {contextMenuElementType === 'dir' && (
               <>
                  <ContextMenuItem text="Open" icon={<FontAwesomeIcon icon={faArrowUpRightFromSquare} />} onClick={handleOpenFile} />
                  <ContextMenuItem text="Open in Terminal" icon={<FontAwesomeIcon icon={faTerminal} />} onClick={handleOpenInTerminal} />
                  <ContextMenuItem text="Copy" icon={<FontAwesomeIcon icon={faCopy} />} />
                  <ContextMenuItem text="Cut" icon={<FontAwesomeIcon icon={faScissors} />} />
                  <ContextMenuItem text="Rename" icon={<FontAwesomeIcon icon={faFilePen} />} />
                  <ContextMenuItem text="Delete" icon={<FontAwesomeIcon icon={faTrash} />} />
               </>
            )}

            {contextMenuElementType === 'file' && (
               <>
                  <ContextMenuItem text="Open" icon={<FontAwesomeIcon icon={faArrowUpRightFromSquare} />} onClick={handleOpenFile} />
                  {AcceptedPreviewFormats.includes(contextMenuElementID.split('.').pop() || '') && <ContextMenuItem text="Preview" icon={<FontAwesomeIcon icon={faEye} />} onClick={handlePreviewFile} />}
                  <ContextMenuItem text="Copy" icon={<FontAwesomeIcon icon={faCopy} />} />
                  <ContextMenuItem text="Cut" icon={<FontAwesomeIcon icon={faScissors} />} />
                  <ContextMenuItem text="Rename" icon={<FontAwesomeIcon icon={faFilePen} />} />
                  <ContextMenuItem text="Delete" icon={<FontAwesomeIcon icon={faTrash} />} />
               </>
            )}

            <ContextMenuItem isSeparator />
            <ContextMenuItem text="Properties" icon={<FontAwesomeIcon icon={faCircleInfo} />} />

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
      </div>
   )
}

export default Directory
