import { useState } from 'react'

import { useStateContext } from '../context/StateContext'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight, faHouse, faList, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons'

import '../styles/components/PathBar.css'

const PathBar = () => {
   const { path, setPath, view, setView } = useStateContext()

   const [oldPath, setOldPath] = useState<string>('')

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setPath(e.target.value)
   const goHome = () => setPath('')

   const goBack = () => {
      if (path === '') return

      setOldPath(path)

      let parts = path.split('\\')

      parts.pop()
      let newPath = parts.join('\\')

      if (newPath.endsWith(':')) newPath += '\\'
      setPath(newPath)
   }

   const goForward = () => {
      setPath(oldPath)
      setOldPath('')
   }

   const switchView = () => {
      if (view == 'grid') return setView('list')
      return setView('grid')
   }

   return (
      <div className="PathBar">
         <button onClick={goHome} className="shadow">
            <FontAwesomeIcon icon={faHouse} />
         </button>

         <div className="controls shadow">
            <button onClick={goBack} disabled={path === ''}>
               <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <button onClick={goForward} disabled={oldPath === ''}>
               <FontAwesomeIcon icon={faArrowRight} />
            </button>
         </div>

         <input type="text" value={path} onChange={handleChange} placeholder="Directory path" className="shadow" />

         <button className="shadow" onClick={switchView}>
            <FontAwesomeIcon icon={view === 'grid' ? faList : faTableCellsLarge} />
         </button>
      </div>
   )
}

export default PathBar
