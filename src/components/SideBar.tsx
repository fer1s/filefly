import { useEffect, useState } from 'react'
import { desktopDir, documentDir, downloadDir, homeDir, pictureDir } from '@tauri-apps/api/path'

import { Volume } from '../types'
import { useStateContext } from '../context/StateContext'

import SearchBar from './SearchBar'

import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDesktop, faDownload, faFileLines, faHardDrive, faHouse, faImage } from '@fortawesome/free-solid-svg-icons'
import { faUsb } from '@fortawesome/free-brands-svg-icons'

import '../styles/components/SideBar.css'

type Pinned = { name: string; path: string; icon: IconDefinition }

const SideBar = () => {
   const { volumes, setSidebarScrolled, setPath } = useStateContext()

   const [pinned, setPinned] = useState<Pinned[]>([])

   // Resolve the standard user directories once and keep only the ones the OS reports.
   useEffect(() => {
      const resolvers: { name: string; icon: IconDefinition; resolve: () => Promise<string> }[] = [
         { name: 'Home', icon: faHouse, resolve: homeDir },
         { name: 'Desktop', icon: faDesktop, resolve: desktopDir },
         { name: 'Documents', icon: faFileLines, resolve: documentDir },
         { name: 'Downloads', icon: faDownload, resolve: downloadDir },
         { name: 'Pictures', icon: faImage, resolve: pictureDir },
      ]

      Promise.all(
         resolvers.map(async ({ name, icon, resolve }) => {
            try {
               // Tauri returns these with a trailing slash; drop it so it matches the rest of the app's paths.
               const path = (await resolve()).replace(/\/+$/, '')
               return path ? { name, path, icon } : null
            } catch {
               return null
            }
         })
      ).then((items) => setPinned(items.filter((item): item is Pinned => item !== null)))
   }, [])

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
               {pinned.map((item) => (
                  <FolderItem key={item.path} item={item} setPath={setPath} />
               ))}
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

type FolderItemProps = {
   item: Pinned
   setPath: (path: string) => void
}

const FolderItem = ({ item, setPath }: FolderItemProps) => {
   return (
      <div className="folder_item" onClick={() => setPath(item.path)}>
         <FontAwesomeIcon icon={item.icon} />
         <p>{item.name}</p>
      </div>
   )
}
