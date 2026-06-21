import { Routes, Route } from "react-router-dom";

import PathBar from "@/features/navigation";

import Volumes from "@/features/volumes";
import Directory from "@/features/directory";

import { ROUTES } from "./routes";

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
  );
}

export default AppContent;
