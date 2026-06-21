import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import "@/styles/components/AppBar.css";

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

  // Double-click the drag region toggles maximize, like a native title bar.
  // Ignore double-clicks landing on the window buttons.
  const handleTitleBarDoubleClick = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if ((event.target as HTMLElement).closest(".window_buttons")) return;
    handleToggleMaximize();
  };

  return (
    <div
      className="app_bar"
      data-tauri-drag-region
      onDoubleClick={handleTitleBarDoubleClick}
    >
      <div className={classNames("title", sidebarScrolled && "hidden")}>
        {t.app.name}
      </div>

      <div className="window_buttons">
        <IconButton icon={faMinus} onClick={handleMinimize} />
        <IconButton
          icon={isMaximized ? faWindowRestore : faWindowMaximize}
          onClick={handleToggleMaximize}
        />
        <IconButton icon={faXmark} onClick={handleClose} />
      </div>
    </div>
  );
};

export default AppBar;
