import { useEffect } from 'react'

import { Volume } from '../types'
import { useStateContext } from '../context/StateContext'

import SearchBar from './SearchBar'

import '../styles/components/SideBar.scss'

import { FaFolder, FaHardDrive } from 'react-icons/fa6'
import { AiFillUsb } from 'react-icons/ai'

const SideBar = () => {
   const { volumes, setSidebarScrolled, setPath } = useStateContext()

   useEffect(() => {
        const sidebar = document.querySelector('.SideBar')
        const handleScroll = () => {
            if (sidebar) {
                setSidebarScrolled(sidebar.scrollTop > 10)
            }
        }

        if (sidebar) {
            sidebar.addEventListener('scroll', handleScroll)
        }

        return () => {
            if (sidebar) {
                sidebar.removeEventListener('scroll', handleScroll)
            }
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
               {volumes.map((volume) => (
                  <VolumeItem key={`${volume.name}#${volume.mountPoint}`} volume={volume} setPath={setPath} />
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
}

const VolumeItem = ({ volume, setPath }: VolumeItemProps) => {
   return (
      <div className="drive_item" onClick={() => setPath(volume.mountPoint)}>
         {volume.isRemovable ? <AiFillUsb /> : <FaHardDrive />}
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
         <FaFolder />
         <p>Downloads</p>
      </div>
   )
}
