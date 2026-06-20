import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'

import { useStateContext } from '../context/StateContext'

import '../styles/components/AppBar.css'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMinus, faWindowMaximize, faXmark } from '@fortawesome/free-solid-svg-icons'

const AppBar = () => {
   const { sidebarScrolled } = useStateContext()

   const handleMinimize = () => {
      getCurrentWindow().minimize()
   }

   const handleToggleMaximize = () => {
      getCurrentWindow().toggleMaximize()
   }

   const handleClose = async () => {
      await invoke('hide_window')
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
