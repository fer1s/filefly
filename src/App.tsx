import { useState, useEffect } from 'react'
import { useNavigate, useLocation, NavigateFunction, Location } from 'react-router-dom'

import { StateProvider } from './context/StateContext'

import AppBar from './components/AppBar'
import SideBar from './components/SideBar'

import AppContent from './AppContent'

import { getVolumes, readDirectory } from './api'
import { Volume, DirEntry } from './types'

const App = () => {
   const navigate: NavigateFunction = useNavigate()
   const location: Location = useLocation()

   const [volumes, setVolumes                ] = useState<Volume[]>([])
   const [path   , setPath                   ] = useState<string>('')
   const [sidebarScrolled, setSidebarScrolled] = useState<boolean>(false)
   const [dirContent, setDirContent          ] = useState<DirEntry[]>([])
   const [view      , setView                ] = useState<'list' | 'grid'>('grid')

   const fetchVolumes = async () => {
        let volumes = await getVolumes()

        // sort volumes by mount point alphabetically
        volumes.sort((a, b) => a.mountPoint < b.mountPoint ? -1 : a.mountPoint > b.mountPoint ? 1 : 0);
        // sort volumes by type (removable last)
        volumes.sort((a, b) => a.isRemovable && !b.isRemovable ? 1 : !a.isRemovable && b.isRemovable ? -1 : 0);

        setVolumes(volumes)
   }

   const fetchDirectory = async (path: string) => {
        let files = await readDirectory(path)

        files.sort((a: DirEntry, b: DirEntry) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
        files.sort((a, b) => a.metadata.isDir && !b.metadata.isDir ? -1 : !a.metadata.isDir && b.metadata.isDir ? 1 : 0);

        return files
   }

    useEffect(() => {
        fetchVolumes()
    }, [])

    useEffect(() => {
        if (path === '') {
            setDirContent([])
            navigate('/')
            return
        }

        fetchDirectory(path).then((files) => {
            setDirContent(files)
            if (location.pathname !== '/directory' && path !== '') navigate('/directory')
        })
    }, [path])

    useEffect(() => {
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault()
        })
    }, [])

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
            view,
            setView,
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