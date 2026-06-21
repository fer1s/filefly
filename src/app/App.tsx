import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation, NavigateFunction, Location } from 'react-router-dom'

import { StateProvider } from '../shared/providers/StateProvider'

import AppBar from './AppBar'
import SideBar from '../features/sidebar'
import Toasts, { ToastData } from '../shared/components/Toast'

import AppContent from './AppContent'

import { setNotifier, ToastType } from '../shared/toast'
import { ROUTES } from './routes'
import { FileSystemManager } from '../shared/managers/FileSystemManager'
import { Volume, DirEntry } from '../shared/models'

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

   // Single domain manager instance for the whole app, provided through context.
   const fs = useMemo(() => new FileSystemManager(), [])

   const fetchVolumes = async () => setVolumes(await fs.listVolumes())

   const fetchDirectory = (path: string) => fs.readDirectory(path)

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
            navigate(ROUTES.volumes)
            return
        }

        fetchDirectory(path).then((files) => {
            setDirContent(files)
            if (location.pathname !== ROUTES.directory && path !== '') navigate(ROUTES.directory)
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
            fs,
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