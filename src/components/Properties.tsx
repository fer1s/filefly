import { DirEntry } from '../shared/models'
import { formatBytes } from '../shared/utils'

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
                  <div className="row">
                     <span className="label">Name</span>
                     <span className="value">{entry.name}</span>
                  </div>
                  <div className="row">
                     <span className="label">Type</span>
                     <span className="value">{entry.metadata.isDir ? 'Directory' : 'File'}</span>
                  </div>
                  <div className="row">
                     <span className="label">Path</span>
                     <span className="value">{entry.path}</span>
                  </div>
                  {entry.metadata.isFile && (
                     <div className="row">
                        <span className="label">Size</span>
                        <span className="value">{formatBytes(entry.size)}</span>
                     </div>
                  )}
                  <div className="row">
                     <span className="label">Created</span>
                     <span className="value">{formatDate(entry.metadata.created.secs_since_epoch)}</span>
                  </div>
                  <div className="row">
                     <span className="label">Modified</span>
                     <span className="value">{formatDate(entry.metadata.modified.secs_since_epoch)}</span>
                  </div>
                  <div className="row">
                     <span className="label">Accessed</span>
                     <span className="value">{formatDate(entry.metadata.accessed.secs_since_epoch)}</span>
                  </div>
               </div>
            )}
         </div>
      </>
   )
}

export default Properties
