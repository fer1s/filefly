import { DirEntry } from '../../../shared/models'
import { formatBytes } from '../../../shared/utils'
import { t } from '../../../lang'

import '../../../styles/components/Properties.css'

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
               <h4>{t.properties.title}</h4>
               <button onClick={onClose}>{t.common.close}</button>
            </div>
            {entry && (
               <div className="properties_content">
                  <div className="row">
                     <span className="label">{t.properties.name}</span>
                     <span className="value">{entry.name}</span>
                  </div>
                  <div className="row">
                     <span className="label">{t.properties.type}</span>
                     <span className="value">{entry.metadata.isDir ? t.common.directory : t.common.file}</span>
                  </div>
                  <div className="row">
                     <span className="label">{t.properties.path}</span>
                     <span className="value">{entry.path}</span>
                  </div>
                  {entry.metadata.isFile && (
                     <div className="row">
                        <span className="label">{t.properties.size}</span>
                        <span className="value">{formatBytes(entry.size)}</span>
                     </div>
                  )}
                  <div className="row">
                     <span className="label">{t.properties.created}</span>
                     <span className="value">{formatDate(entry.metadata.created.secs_since_epoch)}</span>
                  </div>
                  <div className="row">
                     <span className="label">{t.properties.modified}</span>
                     <span className="value">{formatDate(entry.metadata.modified.secs_since_epoch)}</span>
                  </div>
                  <div className="row">
                     <span className="label">{t.properties.accessed}</span>
                     <span className="value">{formatDate(entry.metadata.accessed.secs_since_epoch)}</span>
                  </div>
               </div>
            )}
         </div>
      </>
   )
}

export default Properties
