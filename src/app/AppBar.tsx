import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

import { useStateContext } from "../shared/providers/StateProvider";

import "../styles/components/AppBar.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMinus,
  faWindowMaximize,
  faWindowRestore,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

const AppBar = () => {
  const { sidebarScrolled } = useStateContext();

  const [isMaximized, setIsMaximized] = useState(false);

  // Keep the maximize/restore icon in sync with the real window state.
  useEffect(() => {
    const window = getCurrentWindow();
    let unlisten: (() => void) | undefined;

    const sync = async () => setIsMaximized(await window.isMaximized());

    sync();
    window.onResized(sync).then((fn) => (unlisten = fn));

    return () => unlisten?.();
  }, []);

  const handleMinimize = () => {
    getCurrentWindow().minimize();
  };

  const handleToggleMaximize = async () => {
    const window = getCurrentWindow();
    await window.toggleMaximize();
    setIsMaximized(await window.isMaximized());
  };

  const handleClose = async () => {
    await invoke("hide_window");
  };

  return (
    <div className="app_bar" data-tauri-drag-region>
      <div className={`title${sidebarScrolled ? " hidden" : ""}`}>filefly</div>

      <div className="window_buttons">
        <button onClick={handleMinimize}>
          <FontAwesomeIcon icon={faMinus} />
        </button>
        <button onClick={handleToggleMaximize}>
          <FontAwesomeIcon
            icon={isMaximized ? faWindowRestore : faWindowMaximize}
          />
        </button>
        <button onClick={handleClose}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  );
};

export default AppBar;
