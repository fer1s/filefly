import { useStateContext } from '../context/StateContext'
import { Volume } from '../types'

import { FaHardDrive } from 'react-icons/fa6'
import { AiFillUsb } from 'react-icons/ai'

import '../styles/pages/Volumes.scss'

const Volumes = () => {
   const { volumes, setPath } = useStateContext()
   return (
      <div className="volumes_page">
         <h1>Volumes</h1>
         <div className="grid">
            {volumes.map((volume) => (
                <VolumeItem key={`${volume.name}#${volume.mountPoint}`} volume={volume} setPath={setPath} />
            ))}
         </div>
      </div>
   )
}

export default Volumes

type VolumeItemProps = {
    volume: Volume
    setPath: (path: string) => void
}

const VolumeItem = ({ volume, setPath }: VolumeItemProps) => {
   return (
      <div className="volume_item" onDoubleClick={() => setPath(volume.mountPoint)}>
         {volume.isRemovable ? <AiFillUsb /> : <FaHardDrive />}
         <div className="volume_info">
            <h3>
               <span>{volume.mountPoint}</span> {volume.name}
            </h3>
            <div className="usage">
               <div className="usage_bar" style={{ width: `${volume.diskUsage.percentage}%` }}></div>
            </div>
            <p>
               {volume.availableSpace} free of {volume.totalSpace}
            </p>
         </div>
      </div>
   )
}