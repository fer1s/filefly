import { useEffect, useState } from 'react'

import { useStateContext } from '../shared/providers/StateProvider'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight, faArrowUp, faHouse, faList, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons'

import '../styles/components/PathBar.css'

const PathBar = () => {
   const { path, setPath, view, setView } = useStateContext()

   // Browser-style history: a stack of visited paths plus a position pointer.
   const [history, setHistory] = useState<{ stack: string[]; index: number }>({ stack: [''], index: 0 })

   // Local draft so typing does not navigate (and pollute the history) on every keystroke.
   const [draft, setDraft] = useState<string>(path)

   // Keep the input in sync whenever the path changes from anywhere (sidebar, entries, back/forward, home).
   useEffect(() => setDraft(path), [path])

   // Record every path change into the history stack, unless it already matches the current position
   // (which happens when the change came from goBack/goForward themselves).
   useEffect(() => {
      setHistory((h) => {
         if (h.stack[h.index] === path) return h
         const stack = h.stack.slice(0, h.index + 1)
         stack.push(path)
         return { stack, index: stack.length - 1 }
      })
   }, [path])

   const goHome = () => setPath('')

   // Go up one level to the parent directory. Uses the POSIX separator since paths come from the backend as '/'.
   const goUp = () => {
      if (path === '' || path === '/') return setPath('')
      const trimmed = path.replace(/\/+$/, '')
      const idx = trimmed.lastIndexOf('/')
      setPath(idx <= 0 ? '/' : trimmed.slice(0, idx))
   }

   const goBack = () => {
      if (history.index === 0) return
      const index = history.index - 1
      setHistory({ ...history, index })
      setPath(history.stack[index])
   }

   const goForward = () => {
      if (history.index >= history.stack.length - 1) return
      const index = history.index + 1
      setHistory({ ...history, index })
      setPath(history.stack[index])
   }

   const commitDraft = () => {
      if (draft !== path) setPath(draft)
   }

   const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitDraft()
   }

   const switchView = () => setView(view === 'grid' ? 'list' : 'grid')

   return (
      <div className="PathBar">
         <button onClick={goHome} className="shadow">
            <FontAwesomeIcon icon={faHouse} />
         </button>

         <div className="controls shadow">
            <button onClick={goBack} disabled={history.index === 0}>
               <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <button onClick={goForward} disabled={history.index >= history.stack.length - 1}>
               <FontAwesomeIcon icon={faArrowRight} />
            </button>
            <button onClick={goUp} disabled={path === ''}>
               <FontAwesomeIcon icon={faArrowUp} />
            </button>
         </div>

         <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitDraft}
            placeholder="Directory path"
            className="shadow"
         />

         <button className="shadow" onClick={switchView}>
            <FontAwesomeIcon icon={view === 'grid' ? faList : faTableCellsLarge} />
         </button>
      </div>
   )
}

export default PathBar
