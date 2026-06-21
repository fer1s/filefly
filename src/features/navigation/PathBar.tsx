import { useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { t } from "@/lang";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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

  const switchView = () => setView(view === "grid" ? "list" : "grid");

  return (
    <div className="PathBar">
      <button onClick={goHome} className="shadow">
        <FontAwesomeIcon icon={faHouse} />
      </button>

      <div className="controls shadow">
        <button onClick={goBack} disabled={!canGoBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <button onClick={goForward} disabled={!canGoForward}>
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
        <button onClick={goUp} disabled={path === ""}>
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
      </div>

      <PathInput key={path} path={path} onCommit={setPath} />

      <button className="shadow" onClick={switchView}>
        <FontAwesomeIcon icon={view === "grid" ? faList : faTableCellsLarge} />
      </button>
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
