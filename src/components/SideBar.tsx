import { useEffect } from 'react'

import { Volume } from '../types'
import { useStateContext } from '../context/StateContext'

import SearchBar from './SearchBar'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolder, faHardDrive } from '@fortawesome/free-solid-svg-icons'
import { faUsb } from '@fortawesome/free-brands-svg-icons'

import '../styles/components/SideBar.css'

const SideBar = () => {
   const { volumes, setSidebarScrolled, setPath } = useStateContext()

   useEffect(() => {
        const sidebar = document.querySelector('.SideBar')
        const handleScroll = () => {
            if (!sidebar) return;
            setSidebarScrolled(sidebar.scrollTop > 10)
        }

        if (sidebar) sidebar.addEventListener('scroll', handleScroll)

        return () => {
            if (!sidebar) return;
            sidebar.removeEventListener('scroll', handleScroll)
        }
   }, [])

   return (
      <div className="SideBar">
        
         <SearchBar />

         <section>
            <h2>Pinned</h2>
            <div className="section_content">
               <FolderItem />
            </div>
         </section>

         <section>
            <h2>Drives</h2>
            <div className="section_content">
               {volumes.map((volume, i) => (
                  <VolumeItem key={`${volume.name}#${volume.mountPoint}`} volume={volume} setPath={setPath} index={i} />
               ))}
            </div>
         </section>
      </div>
   )
}

export default SideBar

type VolumeItemProps = {
   volume: Volume
   setPath: (path: string) => void
   index: number
}

const VolumeItem = ({ volume, setPath, index }: VolumeItemProps) => {
   return (
      <div
         className="drive_item"
         onClick={() => setPath(volume.mountPoint)}
         style={{ animationDelay: `${index * 40}ms` }}
      >
         <FontAwesomeIcon icon={volume.isRemovable ? faUsb : faHardDrive} />
         <div className="details">
            <p>
               <span>{volume.mountPoint}</span> {volume.name}
            </p>
            <div className="usage">
               <div className="usage_bar" style={{ width: `${volume.diskUsage.percentage}%` }}></div>
            </div>
         </div>
      </div>
   )
}

const FolderItem = () => {
   return (
      <div className="folder_item">
         <FontAwesomeIcon icon={faFolder} />
         <p>Downloads</p>
      </div>
   )
}
