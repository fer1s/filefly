import { Routes, Route, useLocation } from "react-router-dom";

import PathBar from "@/features/navigation";
import QuickBar from "@/features/quickbar";

import Volumes from "@/features/volumes";
import Directory, { DirectoryProvider, InfoPanel } from "@/features/directory";

import { ROUTES } from "./routes";

function AppContent() {
  const location = useLocation();

  const onDirectory = location.pathname === ROUTES.directory;

  return (
    // The directory state (selection, clipboard, preview…) is shared by the directory view,
    // the QuickBar's quick actions and the info panel, so the provider wraps them all.
    <DirectoryProvider>
      <div className="AppContent">
        <PathBar />
        {/* Zoom only applies to the directory view, so the quick bar is hidden on Volumes. */}
        {onDirectory && <QuickBar />}
        <div className="Page">
          <div className="page_main">
            <Routes>
              <Route path={ROUTES.volumes} element={<Volumes />} />
              <Route path={ROUTES.directory} element={<Directory />} />
            </Routes>
          </div>
          {onDirectory && <InfoPanel />}
        </div>
      </div>
    </DirectoryProvider>
  );
}

export default AppContent;
