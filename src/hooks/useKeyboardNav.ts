import { useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { DirEntry } from '../lib/models'

type Params = {
   items: DirEntry[]
   view: 'grid' | 'list'
   enabled: boolean
   setSelectedIDs: Dispatch<SetStateAction<string[]>>
   onOpen: (entry: DirEntry) => void
}

// Keyboard navigation over the visible entries: arrows move a cursor (and select it), Enter opens,
// Escape clears, and printable characters drive type-to-find. Disabled while `enabled` is false.
export const useKeyboardNav = ({ items, view, enabled, setSelectedIDs, onOpen }: Params) => {
   const searchBufferRef = useRef('')
   const searchTimerRef = useRef<number | null>(null)

   useEffect(() => {
      // Skip when typing in the path bar or any other text field.
      const isTypingTarget = (el: EventTarget | null) => {
         const t = el as HTMLElement | null
         return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
      }

      // Number of items in the first grid row, used as the vertical step.
      const columns = () => {
         const els = Array.from(document.querySelectorAll<HTMLElement>('.directory_page .grid .dir_entry_item'))
         if (!els.length) return 1
         const top = els[0].offsetTop
         let cols = 0
         for (const el of els) {
            if (el.offsetTop === top) cols++
            else break
         }
         return cols || 1
      }

      // Move the cursor by delta relative to the last selected entry and select that single entry.
      const move = (delta: number) =>
         setSelectedIDs((prev) => {
            if (!items.length) return prev
            const current = prev.length ? items.findIndex((e) => e.path === prev[prev.length - 1]) : -1
            const next = Math.max(0, Math.min(items.length - 1, current < 0 ? 0 : current + delta))
            return [items[next].path]
         })

      // Open the last selected entry.
      const open = () =>
         setSelectedIDs((prev) => {
            const entry = prev.length ? items.find((e) => e.path === prev[prev.length - 1]) : undefined
            if (entry) onOpen(entry)
            return prev
         })

      // Type-to-find: accumulate typed chars; a single-char buffer starts after the current entry so
      // repeated presses cycle through matches.
      const typeahead = (char: string) => {
         if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
         searchBufferRef.current += char.toLowerCase()
         searchTimerRef.current = window.setTimeout(() => (searchBufferRef.current = ''), 700)

         const buf = searchBufferRef.current
         setSelectedIDs((prev) => {
            if (!items.length) return prev
            const current = prev.length ? items.findIndex((e) => e.path === prev[prev.length - 1]) : -1
            const start = buf.length === 1 ? current + 1 : 0
            for (let i = 0; i < items.length; i++) {
               const entry = items[(start + i) % items.length]
               if (entry.name.toLowerCase().startsWith(buf)) return [entry.path]
            }
            return prev
         })
      }

      const handleKeyDown = (e: KeyboardEvent) => {
         if (isTypingTarget(e.target)) return
         if (!enabled) return

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
   }, [items, view, enabled])
}
