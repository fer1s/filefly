import { useCallback, useRef, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { VIEW_MODE, RECENTS } from "@/shared/constants";
import { useKeymap, formatBinding, KEYMAP_ACTION } from "@/shared/keymap";
import { classNames, isTagsPath, tagFromPath, dirname } from "@/shared/utils";
import { useDirectory } from "@/features/directory";
import { t } from "@/lang";

import { usePathBarShortcuts } from "./hooks/usePathBarShortcuts";
import PathField from "./components/PathField";
import PathSearch from "./components/PathSearch";
import SearchFilters from "./components/SearchFilters";
import { VIEW_OPTIONS } from "./constants";

import {
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faHouse,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/PathBar.css";

const PathBar = () => {
  const {
    fs,
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // The search shortcut focuses the persistent field without stealing focus on navigation.
  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);
  const closeSearch = useCallback(() => {
    setSearch("");
    searchInputRef.current?.blur();
  }, [setSearch]);

  const { revealEntries } = useDirectory();

  // Committing a FILE path in the path field navigates to its folder, then reveals the file once
  // that directory's listing has loaded. Anything else — a folder, or a path that can't be
  // stat'ed — navigates as before (a bad path surfaces through the normal load-error handling).
  const commitPath = useCallback(
    async (next: string) => {
      try {
        const entry = await fs.getEntry(next);
        if (entry.metadata.isFile) {
          revealEntries(dirname(entry.path), [entry.path]);
          return;
        }
      } catch {
        // Not stat-able (missing, remote error, virtual path) → plain navigation below.
      }
      setPath(next);
    },
    [fs, setPath, revealEntries],
  );

  const goHome = () => setPath("");

  // Go up one level to the parent directory. Uses the POSIX separator since paths come from the backend as '/'.
  const goUp = () => {
    if (path === RECENTS || isTagsPath(path)) return; // Virtual views have no parent.
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
    toggleSearch: focusSearch,
    closeSearch,
    searchActive: searchFocused || search.length > 0,
  });

  return (
    <div className="PathBar">
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
          disabled={path === "" || path === RECENTS || isTagsPath(path)}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
          tooltip={t.pathbar.up}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.NAV_UP])}
          aria-label={t.pathbar.up}
        />
      </div>

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

      {path === RECENTS ? (
        <div className="path_label shadow">{t.pathbar.recents}</div>
      ) : isTagsPath(path) ? (
        <div className="path_label shadow">{tagFromPath(path)}</div>
      ) : (
        <PathField key={path} path={path} onCommit={commitPath} />
      )}

      <PathSearch
        value={search}
        onChange={setSearch}
        inputRef={searchInputRef}
        onFocusChange={setSearchFocused}
      />

      {/* Search-result filters live just left of the view toggle, only while a search is active. */}
      {search.trim().length > 0 && <SearchFilters />}

      {VIEW_OPTIONS.map(({ value, icon, label }) => (
        <IconButton
          key={value}
          icon={icon}
          onClick={() => setView(value)}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
          tooltip={label()}
          hotkey={formatBinding(keymap[KEYMAP_ACTION.TOGGLE_VIEW])}
          aria-label={label()}
          aria-pressed={view === value}
          className={classNames(
            "shadow",
            "view_toggle",
            view === value && "active",
          )}
        />
      ))}

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
