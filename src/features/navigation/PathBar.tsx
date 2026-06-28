import { useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { KEY, VIEW_MODE } from "@/shared/constants";
import { useKeymap, formatBinding, KEYMAP_ACTION } from "@/shared/keymap";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import { usePathBarShortcuts } from "./hooks/usePathBarShortcuts";

import {
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faHouse,
  faList,
  faTableCellsLarge,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/PathBar.css";

const PathBar = () => {
  const {
    path,
    setPath,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    view,
    setView,
    toggleShowHidden,
    infoPanelOpen,
    toggleInfoPanel,
  } = useStateContext();

  const goHome = () => setPath("");

  // Go up one level to the parent directory. Uses the POSIX separator since paths come from the backend as '/'.
  const goUp = () => {
    if (path === "" || path === "/") return setPath("");
    const trimmed = path.replace(/\/+$/, "");
    const idx = trimmed.lastIndexOf("/");
    setPath(idx <= 0 ? "/" : trimmed.slice(0, idx));
  };

  const switchView = () =>
    setView(view === VIEW_MODE.GRID ? VIEW_MODE.LIST : VIEW_MODE.GRID);

  const { keymap } = useKeymap();
  usePathBarShortcuts({
    goBack,
    goForward,
    goUp,
    toggleView: switchView,
    toggleHidden: toggleShowHidden,
  });

  return (
    <div className="PathBar">
      <IconButton
        icon={faHouse}
        onClick={goHome}
        variant={ICON_BUTTON_VARIANT.BOXED}
        size={ICON_BUTTON_SIZE.LG}
        tooltip={t.pathbar.home}
        aria-label={t.pathbar.home}
        className="shadow"
      />

      <div className="controls shadow">
        <IconButton
          icon={faArrowLeft}
          onClick={goBack}
          disabled={!canGoBack}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
          tooltip={t.pathbar.back}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.NAV_BACK])}
          aria-label={t.pathbar.back}
        />
        <IconButton
          icon={faArrowRight}
          onClick={goForward}
          disabled={!canGoForward}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
          tooltip={t.pathbar.forward}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.NAV_FORWARD])}
          aria-label={t.pathbar.forward}
        />
        <IconButton
          icon={faArrowUp}
          onClick={goUp}
          disabled={path === ""}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
          tooltip={t.pathbar.up}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.NAV_UP])}
          aria-label={t.pathbar.up}
        />
      </div>

      <PathInput key={path} path={path} onCommit={setPath} />

      <IconButton
        icon={view === VIEW_MODE.GRID ? faList : faTableCellsLarge}
        onClick={switchView}
        variant={ICON_BUTTON_VARIANT.BOXED}
        size={ICON_BUTTON_SIZE.LG}
        tooltip={t.pathbar.toggleView}
        hotkey={formatBinding(keymap[KEYMAP_ACTION.TOGGLE_VIEW])}
        aria-label={t.pathbar.toggleView}
        className="shadow"
      />

      <IconButton
        icon={faCircleInfo}
        onClick={toggleInfoPanel}
        variant={ICON_BUTTON_VARIANT.BOXED}
        size={ICON_BUTTON_SIZE.LG}
        tooltip={t.pathbar.toggleInfo}
        aria-label={t.pathbar.toggleInfo}
        className={classNames("shadow", "info_toggle", infoPanelOpen && "active")}
      />
    </div>
  );
};

export default PathBar;

type PathInputProps = {
  path: string;
  onCommit: (path: string) => void;
};

const PathInput = ({ path, onCommit }: PathInputProps) => {
  // Local draft prevents navigation on every keystroke. The parent key resets it after any navigation.
  const [draft, setDraft] = useState(path);

  const commitDraft = () => {
    if (draft !== path) onCommit(draft);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEY.ENTER) commitDraft();
  };

  return (
    <input
      type="text"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={commitDraft}
      placeholder={t.pathbar.pathPlaceholder}
      className="shadow"
    />
  );
};
