import { Routes, Route } from 'react-router-dom'

import PathBar from './components/PathBar'

import Volumes from './pages/Volumes'
import Directory from './pages/Directory'

function AppContent() {
   return (
      <div className="AppContent">
         <PathBar />
         <div className="Page">
            <Routes>
               <Route path="/">
                  <Route index element={<Volumes />} />
                  <Route path="directory" element={<Directory />} />
               </Route>
            </Routes>
         </div>
      </div>
   )
}

export default AppContent