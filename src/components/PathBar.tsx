import { useState } from 'react';

import { useStateContext } from '../context/StateContext'

import { RiHomeFill } from "react-icons/ri";
import { FaArrowLeft, FaArrowRight  } from "react-icons/fa";

import '../styles/components/PathBar.scss'

const PathBar = () => {

   const { path, setPath } = useStateContext()

   const [oldPath, setOldPath] = useState<string>('')

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPath(e.target.value)
   }

   const goHome = () => {
      setPath('')
   }
   
   const goBack = () => {
      if(path === '') return

      setOldPath(path)

      let parts = path.split('\\')

      parts.pop()
      let newPath = parts.join('\\')

      if(newPath.endsWith(':')) newPath += '\\'
      setPath(newPath)
   }

   const goForward = () => {
      setPath(oldPath)
      setOldPath('')
   }

   return (
      <div className="PathBar">
         <button onClick={goHome} className='shadow'>
            <RiHomeFill />
         </button>

         <div className="controls shadow">
            <button
               onClick={goBack}
               disabled={path === ''}
            >
               <FaArrowLeft />
            </button>
            <button
               onClick={goForward}
               disabled={oldPath === ''}
            >
               <FaArrowRight />
            </button>
         </div>

         <input type="text"
            value={path}
            onChange={handleChange}
            placeholder="Directory path"
            className="shadow"
         />
      </div>
   )
}

export default PathBar
