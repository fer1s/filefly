import { DirEntry } from '../types'
import { formatBytes } from '../utils'

import '../styles/components/Properties.css'

type PropertiesProps = {
   entry: DirEntry | null
   visible: boolean
   onClose: () => void
}

const formatDate = (secs: number) => new Date(secs * 1000).toLocaleString()

const Properties = ({ entry, visible, onClose }: PropertiesProps) => {
   return (
      <>
         <div className={`properties_backdrop${visible ? ' visible' : ''}`} onClick={onClose}></div>
         <div className={`properties_modal shadow${visible ? ' visible' : ''}`}>
            <div className="properties_header">
               <h4>Properties</h4>
               <button onClick={onClose}>Close</button>
            </div>
            {entry && (
               <div className="properties_content">
                  <h3>
                     Name <span>{entry.name}</span>
                  </h3>
                  <h3>
                     Type <span>{entry.metadata.isDir ? 'Directory' : 'File'}</span>
                  </h3>
                  <h3>
                     Path <span>{entry.path}</span>
                  </h3>
                  {entry.metadata.isFile && (
                     <h3>
                        Size <span>{formatBytes(entry.size)}</span>
                     </h3>
                  )}
                  <h3>
                     Created <span>{formatDate(entry.metadata.created.secs_since_epoch)}</span>
                  </h3>
                  <h3>
                     Modified <span>{formatDate(entry.metadata.modified.secs_since_epoch)}</span>
                  </h3>
                  <h3>
                     Accessed <span>{formatDate(entry.metadata.accessed.secs_since_epoch)}</span>
                  </h3>
               </div>
            )}
         </div>
      </>
   )
}

export default Properties
