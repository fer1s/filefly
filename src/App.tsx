import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, NavigateFunction, Location } from 'react-router-dom'

import { StateProvider } from './context/StateContext'

import AppBar from './components/AppBar'
import SideBar from './components/SideBar'
import Toasts, { ToastData } from './components/Toast'

import AppContent from './AppContent'

import { getVolumes, readDirectory } from './api'
import { setNotifier, ToastType } from './toast'
import { Volume, DirEntry } from './types'

const App = () => {
   const navigate: NavigateFunction = useNavigate()
   const location: Location = useLocation()

   const [volumes, setVolumes                ] = useState<Volume[]>([])
   const [path   , setPath                   ] = useState<string>('')
   const [sidebarScrolled, setSidebarScrolled] = useState<boolean>(false)
   const [dirContent, setDirContent          ] = useState<DirEntry[]>([])
   const [view      , setView                ] = useState<'list' | 'grid'>('grid')
   const [search    , setSearch              ] = useState<string>('')
   const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('sidebarCollapsed') === 'true')

   const [toasts, setToasts] = useState<ToastData[]>([])
   const toastId = useRef(0)

   // Persist the collapsed state across sessions.
   useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed))
   }, [sidebarCollapsed])

   // Register the global notifier so any module can push a toast; auto-dismiss after a few seconds.
   useEffect(() => {
        const addToast = (message: string, type: ToastType) => {
            const id = ++toastId.current
            setToasts((prev) => [...prev, { id, message, type }])
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
        }

        setNotifier(addToast)
        return () => setNotifier(null)
   }, [])

   const fetchVolumes = async () => {
        let volumes = await getVolumes()

        // macOS APFS exposes the data volume (/System/Volumes/Data) and other synthetic system
        // volumes as duplicates of Macintosh HD (/). Hide them; navigating / shows the merged tree.
        volumes = volumes.filter((v) => !v.mountPoint.startsWith('/System/Volumes/'))

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

   // Reload the current view (used after filesystem operations like copy/move/rename/delete).
   const refreshDir = () => {
        if (path === '') return fetchVolumes()
        fetchDirectory(path).then(setDirContent)
   }

    useEffect(() => {
        fetchVolumes()
    }, [])

    useEffect(() => {
        // Reset the filter whenever we navigate so the new directory shows in full.
        setSearch('')

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
            search,
            setSearch,
            refreshDir,
         }}
      >
         <AppBar />
         <div className={sidebarCollapsed ? 'App collapsed' : 'App'}>
            <SideBar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
            <AppContent />
         </div>
         <Toasts toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </StateProvider>
   )
}

export default App