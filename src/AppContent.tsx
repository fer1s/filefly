import { Routes, Route } from 'react-router-dom'

import PathBar from './components/PathBar'

import Volumes from './views/Volumes'
import Directory from './views/Directory'

import { ROUTES } from './app/routes'

function AppContent() {
   return (
      <div className="AppContent">
         <PathBar />
         <div className="Page">
            <Routes>
               <Route path={ROUTES.volumes} element={<Volumes />} />
               <Route path={ROUTES.directory} element={<Directory />} />
            </Routes>
         </div>
      </div>
   )
}

export default AppContent