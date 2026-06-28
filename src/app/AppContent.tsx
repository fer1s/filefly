import { Routes, Route, useLocation } from "react-router-dom";

import PathBar from "@/features/navigation";
import QuickBar from "@/features/quickbar";

import Volumes from "@/features/volumes";
import Directory, { DirectoryProvider } from "@/features/directory";

import { ROUTES } from "./routes";

function AppContent() {
  const location = useLocation();

  return (
    // The directory state (selection, clipboard, preview…) is shared by the directory view
    // and the QuickBar's quick actions, so the provider wraps both.
    <DirectoryProvider>
      <div className="AppContent">
        <PathBar />
        {/* Zoom only applies to the directory view, so the quick bar is hidden on Volumes. */}
        {location.pathname === ROUTES.directory && <QuickBar />}
        <div className="Page">
          <Routes>
            <Route path={ROUTES.volumes} element={<Volumes />} />
            <Route path={ROUTES.directory} element={<Directory />} />
          </Routes>
        </div>
      </div>
    </DirectoryProvider>
  );
}

export default AppContent;
