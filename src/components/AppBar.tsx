import { appWindow } from '@tauri-apps/api/window'
import { getCurrent } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api'

import { useStateContext } from '../context/StateContext'

import '../styles/components/AppBar.css'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMinus, faWindowMaximize, faXmark } from '@fortawesome/free-solid-svg-icons'

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
               <FontAwesomeIcon icon={faMinus} />
            </button>
            <button onClick={handleToggleMaximize}>
               <FontAwesomeIcon icon={faWindowMaximize} />
            </button>
            <button onClick={handleClose}>
               <FontAwesomeIcon icon={faXmark} />
            </button>
         </div>
      </div>
   )
}

export default AppBar
