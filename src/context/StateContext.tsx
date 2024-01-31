import { createContext, useContext } from 'react'

import { Volume, DirEntry } from '../types'

type State = {
   volumes: Volume[]
   setVolumes: (volumes: Volume[]) => void
   path: string
   setPath: (path: string) => void
   sidebarScrolled: boolean
   setSidebarScrolled: (sidebarScrolled: boolean) => void
   dirContent: DirEntry[]
   setDirContent: (dirContent: DirEntry[]) => void
   view: 'list' | 'grid'
   setView: (view: 'list' | 'grid') => void
}

export const initialState: State = {
   volumes: [],
   setVolumes: () => {},
   path: '',
   setPath: () => {},
   sidebarScrolled: false,
   setSidebarScrolled: () => {},
   dirContent: [],
   setDirContent: () => {},
   view: 'grid',
   setView: () => {},
}

const StateContext = createContext<State>(initialState)

export const StateProvider = StateContext.Provider

export const useStateContext = () => useContext(StateContext)