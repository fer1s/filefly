import { useCallback, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { VIEW_MODE, RECENTS } from "@/shared/constants";
import { useKeymap, formatBinding, KEYMAP_ACTION } from "@/shared/keymap";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import { usePathBarShortcuts } from "./hooks/usePathBarShortcuts";
import PathField from "./components/PathField";
import PathSearch from "./components/PathSearch";

import {
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faHouse,
  faList,
  faMagnifyingGlass,
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
    search,
    setSearch,
  } = useStateContext();

  // Inline search field. `searchOpen` = mounted (replacing the search button); `searchClosing` =
  // playing the exit animation before unmount. Closing also clears the filter.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);

  const openSearch = useCallback(() => {
    setSearchClosing(false);
    setSearchOpen(true);
  }, []);
  // Start the exit animation and clear the filter; the unmount happens on the animation's end.
  const closeSearch = useCallback(() => {
    setSearchClosing(true);
    setSearch("");
  }, [setSearch]);
  const finishCloseSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchClosing(false);
  }, []);
  const toggleSearch = useCallback(
    () => (searchOpen && !searchClosing ? closeSearch() : openSearch()),
    [searchOpen, searchClosing, closeSearch, openSearch],
  );

  // Collapse search on navigation (the filter is per-tab and resets on a new folder anyway).
  // Adjusting state during render on a changed value, per React's "you might not need an effect".
  const [prevPath, setPrevPath] = useState(path);
  if (path !== prevPath) {
    setPrevPath(path);
    setSearchOpen(false);
    setSearchClosing(false);
  }

  const goHome = () => setPath("");

  // Go up one level to the parent directory. Uses the POSIX separator since paths come from the backend as '/'.
  const goUp = () => {
    if (path === RECENTS) return; // Recents has no parent.
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
    goHome,
    toggleView: switchView,
    toggleHidden: toggleShowHidden,
    toggleInfo: toggleInfoPanel,
    toggleSearch,
  });

  return (
    <div className="PathBar">
      <IconButton
        icon={faHouse}
        onClick={goHome}
        variant={ICON_BUTTON_VARIANT.BOXED}
        size={ICON_BUTTON_SIZE.LG}
        tooltip={t.pathbar.home}
        hotkey={formatBinding(keymap[KEYMAP_ACTION.GO_HOME])}
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
          disabled={path === "" || path === RECENTS}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
          tooltip={t.pathbar.up}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.NAV_UP])}
          aria-label={t.pathbar.up}
        />
      </div>

      {path === RECENTS ? (
        <div className="path_label shadow">{t.pathbar.recents}</div>
      ) : (
        <PathField key={path} path={path} onCommit={setPath} />
      )}

      {/* The search button expands into an inline folder filter; while open it replaces the
          button (no redundancy) and shrinks the path field. */}
      {searchOpen ? (
        <PathSearch
          value={search}
          onChange={setSearch}
          onClose={closeSearch}
          closing={searchClosing}
          onExited={finishCloseSearch}
        />
      ) : (
        <IconButton
          icon={faMagnifyingGlass}
          onClick={openSearch}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
          tooltip={t.pathbar.search}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.SEARCH])}
          aria-label={t.pathbar.search}
          className="shadow search_toggle"
        />
      )}

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
        hotkey={formatBinding(keymap[KEYMAP_ACTION.TOGGLE_INFO])}
        aria-label={t.pathbar.toggleInfo}
        className={classNames(
          "shadow",
          "info_toggle",
          infoPanelOpen && "active",
        )}
      />
    </div>
  );
};

export default PathBar;
