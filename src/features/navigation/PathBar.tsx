import { useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { VIEW_MODE } from "@/shared/constants";
import { t } from "@/lang";

import {
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faHouse,
  faList,
  faTableCellsLarge,
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

  return (
    <div className="PathBar">
      <IconButton
        icon={faHouse}
        onClick={goHome}
        variant={ICON_BUTTON_VARIANT.BOXED}
        size={ICON_BUTTON_SIZE.LG}
        className="shadow"
      />

      <div className="controls shadow">
        <IconButton
          icon={faArrowLeft}
          onClick={goBack}
          disabled={!canGoBack}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
        />
        <IconButton
          icon={faArrowRight}
          onClick={goForward}
          disabled={!canGoForward}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
        />
        <IconButton
          icon={faArrowUp}
          onClick={goUp}
          disabled={path === ""}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
        />
      </div>

      <PathInput key={path} path={path} onCommit={setPath} />

      <IconButton
        icon={view === VIEW_MODE.GRID ? faList : faTableCellsLarge}
        onClick={switchView}
        variant={ICON_BUTTON_VARIANT.BOXED}
        size={ICON_BUTTON_SIZE.LG}
        className="shadow"
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
    if (event.key === "Enter") commitDraft();
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
