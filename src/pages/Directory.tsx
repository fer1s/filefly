import { useStateContext } from '../context/StateContext'
import { DirEntry } from '../types'

import { FaFolder, FaFile } from 'react-icons/fa6'

import '../styles/pages/Directory.scss'

const Directory = () => {
   const { dirContent, setPath } = useStateContext()

   return (
      <div className="directory_page">
         <div className="grid">
            {dirContent.map((entry) => (
               <DirEntryItem key={`${entry.name}#${entry.path}`} entry={entry} setPath={setPath} />
            ))}
         </div>
      </div>
   )
}

export default Directory

type DirEntryItemProps = {
   entry: DirEntry
   setPath: (path: string) => void
}

const DirEntryItem = ({ entry, setPath }: DirEntryItemProps) => {
   const navigateToPath = () => {
      if (entry.metadata.isDir) {
         setPath(entry.path)
      }
   }

   // split extension from name
   let name = entry.name
   let extension = ''
   if (entry.metadata.isFile) {
      let parts = name.split('.')
      extension = parts[parts.length - 1]
      name = parts.slice(0, parts.length - 1).join('.')
   }

   return (
      <div className="dir_entry_item" onDoubleClick={navigateToPath}>
         {(extension && name) && <div className="extension">{extension}</div>}
         {entry.metadata.isDir ? <FaFolder /> : <FaFile />}
         <div className="dir_entry_info">
            <h3>
               {
                  // cut off if too long
                  name.length > 9 ? name.substring(0, 9) + '...' : name
               }
            </h3>
         </div>
      </div>
   )
}
