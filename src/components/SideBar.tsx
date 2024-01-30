import { useEffect } from 'react'
import { motion } from 'framer-motion'

import { Volume } from '../types'
import { useStateContext } from '../context/StateContext'

import SearchBar from './SearchBar'

import '../styles/components/SideBar.scss'

import { FaFolder, FaHardDrive } from 'react-icons/fa6'
import { AiFillUsb } from 'react-icons/ai'

const animatedListVariants = {
   visible: (i: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
         delay: i * 0.04,
      },
   }),
   hidden: {
      opacity: 0,
      x: "-100%",
      scale: 0.7,
   },
}

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
      <motion.div
         className="drive_item"
         onClick={() => setPath(volume.mountPoint)}
         variants={animatedListVariants}
         initial="hidden"
         animate="visible"
         custom={index}
      >
         {volume.isRemovable ? <AiFillUsb /> : <FaHardDrive />}
         <div className="details">
            <p>
               <span>{volume.mountPoint}</span> {volume.name}
            </p>
            <div className="usage">
               <div className="usage_bar" style={{ width: `${volume.diskUsage.percentage}%` }}></div>
            </div>
         </div>
      </motion.div>
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
