import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import { StateProvider } from './context/StateContext'

import AppBar from './components/AppBar'
import SideBar from './components/SideBar'

import AppContent from './AppContent'

import { getVolumes, readDirectory } from './api'
import { Volume, DirEntry } from './types'

const App = () => {
   const navigate = useNavigate()
   const location = useLocation()

   const [volumes, setVolumes] = useState<Volume[]>([])
   const [path, setPath] = useState<string>('')
   const [sidebarScrolled, setSidebarScrolled] = useState<boolean>(false)
   const [dirContent, setDirContent] = useState<DirEntry[]>([])

   const fetchVolumes = async () => {
      let volumes = await getVolumes()

      // sort volumes by mount point alphabetically
      volumes.sort((a, b) => {
         if (a.mountPoint < b.mountPoint) {
            return -1
         }
         if (a.mountPoint > b.mountPoint) {
            return 1
         }
         return 0
      })

      // sort volumes by type (removable last)
      volumes.sort((a, b) => {
         if (a.isRemovable && !b.isRemovable) {
            return 1
         }
         if (!a.isRemovable && b.isRemovable) {
            return -1
         }
         return 0
      })

      setVolumes(volumes)
   }

   const fetchDirectory = async (path: string) => {
      let files = await readDirectory(path)
      
      // sort files by name alphabetically
      files.sort((a, b) => {
         if (a.name < b.name) {
            return -1
         }
         if (a.name > b.name) {
            return 1
         }
         return 0
      })

      // sort files by type (directories first)
      files.sort((a, b) => {
         if (a.metadata.isDir && !b.metadata.isDir) {
            return -1
         }
         if (!a.metadata.isDir && b.metadata.isDir) {
            return 1
         }
         return 0
      })

      return files
   }

   useEffect(() => {
      fetchVolumes()
   }, [])

   useEffect(() => {
      if(path === '') {
         setDirContent([])
         navigate('/')
         return
      }
      fetchDirectory(path).then((files) => {
         setDirContent(files)

         if (location.pathname !== '/directory' && path !== '') {
            navigate('/directory')
         }
      })
   }, [path])

   return (
      <StateProvider
         value={{
            volumes,
            setVolumes,
            path,
            setPath,
            sidebarScrolled,
            setSidebarScrolled,
            dirContent,
            setDirContent,
         }}
      >
            <AppBar />
            <div className="App">
               <SideBar />
               <AppContent />
            </div>
      </StateProvider>
   )
}

export default App
