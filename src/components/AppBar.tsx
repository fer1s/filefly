import { appWindow } from '@tauri-apps/api/window'
import { getCurrent } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api'

import { useStateContext } from '../context/StateContext'

import '../styles/components/AppBar.scss'

import { VscChromeMinimize, VscChromeMaximize, VscChromeClose } from 'react-icons/vsc'

const AppBar = () => {
   const { sidebarScrolled } = useStateContext()

   const handleMinimize = () => {
      appWindow.minimize()
   }

   const handleToggleMaximize = () => {
      appWindow.toggleMaximize()
   }

   const handleClose = async () => {
      const window = getCurrent()
      await invoke('hide_window', { window })
   }

   return (
      <div className="app_bar" data-tauri-drag-region>
         <div className={`title${sidebarScrolled ? ' hidden' : ''}`}>filefly</div>

         <div className="window_buttons">
            <button onClick={handleMinimize}>
               <VscChromeMinimize />
            </button>
            <button onClick={handleToggleMaximize}>
               <VscChromeMaximize />
            </button>
            <button onClick={handleClose}>
               <VscChromeClose />
            </button>
         </div>
      </div>
   )
}

export default AppBar
