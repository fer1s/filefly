import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import DialogActions from "@/shared/components/patterns/DialogActions";
import TypeaheadPopup from "@/shared/components/patterns/TypeaheadPopup";
import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import TagDots from "@/shared/components/elements/TagDots";
import TextInput from "@/shared/components/elements/TextInput";
import { useStateContext } from "@/shared/providers/StateProvider";
import { useTags } from "@/shared/providers/TagsProvider";
import {
  useTypeahead,
  findTypeaheadMatch,
  typeaheadStartIndex,
} from "@/shared/hooks/useTypeahead";
import {
  entryIconColor,
  getFileIcon,
  useFileTypeExtensions,
} from "@/shared/formats";
import { KEY } from "@/shared/constants";
import { classNames, dirname } from "@/shared/utils";
import { t } from "@/lang";

import {
  faChevronRight,
  faFolder,
  faHardDrive,
  faArrowLeft,
  faFolderPlus,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/FolderPicker.css";

import {
  PATH_PICKER_TITLE_ID,
  FAVORITE_ORDER,
  FAVORITE_ICON,
  NO_TAGS,
} from "./constants";
import {
  crumbsFor,
  filterEntries,
  loadEntries,
  loadFavorites,
  loadLocations,
  resolveHome,
} from "./utils";
import { PICK_KIND } from "./types";
import type {
  PathPickerDialogProps,
  PickerEntry,
  Favorite,
  Location,
} from "./types";

// The app's own path picker, styled after the macOS Finder open panel: a Favorites/Locations
// source list on the left and the current folder's contents on the right. Config-driven so it
// serves both the folder picker (choose a folder) and the file picker (navigate folders, choose a
// file — optionally filtered by extension). Backed by the same readDirectory/getVolumes IPC as the
// main browser.
const PathPickerDialog = ({
  visible,
  config,
  colorfulFileTypes = false,
  initialPath,
  onChoose,
  onClose,
}: PathPickerDialogProps) => {
  const { fs } = useStateContext();
  const { tags: tagsByPath, loadTags } = useTags();
  // Subscribed like the directory's EntryIcon, so a remapped extension re-glyphs open rows.
  const fileTypes = useFileTypeExtensions();
  const isFileMode = config.kind === PICK_KIND.FILE;

  // Empty rawPath falls back to the home folder (resolved async) as the default open location.
  const [rawPath, setRawPath] = useState("");
  const [home, setHome] = useState("");
  const path = rawPath || home;

  // null while the current level is loading (mirrors the repo's loading-as-null convention).
  const [entries, setEntries] = useState<PickerEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // Bumped to force a reload of the current folder (e.g. after creating a new folder).
  const [reloadKey, setReloadKey] = useState(0);

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Name filter over the current folder (client-side). Reset whenever the folder changes — derived
  // during render so the new folder never renders one frame through the old filter.
  const [query, setQuery] = useState("");
  const [queryPath, setQueryPath] = useState(path);
  if (queryPath !== path) {
    setQueryPath(path);
    setQuery("");
  }

  // Type-to-find feedback for the popup; the buffer itself lives in the shared hook.
  const [typeaheadQuery, setTypeaheadQuery] = useState("");
  const typeahead = useTypeahead({ onChange: setTypeaheadQuery });
  const clearTypeahead = typeahead.clear;

  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRowRef = useRef<HTMLButtonElement>(null);

  // Resolve the source list (Favorites + Locations) and the home folder once.
  useEffect(() => {
    let cancelled = false;
    void loadFavorites().then((f) => !cancelled && setFavorites(f));
    void loadLocations().then((l) => !cancelled && setLocations(l));
    void resolveHome().then((h) => !cancelled && setHome(h));
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset to the caller's starting folder each time the dialog opens (see React "adjusting state
  // while rendering" — done in render so the load below sees the fresh path immediately).
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setRawPath(initialPath);
      setEntries(null);
      setSelected(null);
      setQuery("");
    }
  }

  // End any type-to-find when the dialog closes, so it never reopens mid-search.
  useEffect(() => {
    if (!visible) return;
    return clearTypeahead;
  }, [visible, clearTypeahead]);

  // Keyboard focus starts on the list (not the search field, which the Dialog's "first input"
  // focus would pick) so arrows and type-to-find work at once — on open and after each folder
  // change. Deferred a frame so it lands after the Dialog's own initial-focus pass.
  useEffect(() => {
    if (!visible) return;
    const frame = window.requestAnimationFrame(() => listRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [visible, path]);

  // Load the current folder's contents (or the volumes list until the home folder resolves).
  // setState only fires from the async callback, guarded against landing after navigation.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    loadEntries(path, config.kind, config.extensions).then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, path, reloadKey, config.kind, config.extensions]);

  // The rows actually shown: the folder's entries narrowed by the search query.
  const visibleEntries = useMemo(
    () => (entries ? filterEntries(entries, query) : null),
    [entries, query],
  );

  const atRoot = path === "";

  // Finder tags for the visible rows only (lazy, de-duped by the provider). The virtual root lists
  // volumes, which show a drive glyph and no tag colour, so they are not read.
  const visiblePaths = useMemo(
    () =>
      atRoot || !visibleEntries
        ? []
        : visibleEntries.map((entry) => entry.path),
    [atRoot, visibleEntries],
  );
  useEffect(() => {
    if (visiblePaths.length) void loadTags(visiblePaths);
  }, [loadTags, visiblePaths]);

  // Keep the keyboard-selected row visible as the cursor moves past the list's edges.
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected, visibleEntries]);

  // Navigate into a folder: clear the pending listing (shows loading), the selection and any
  // type-to-find (the search query resets with the path, above).
  const enter = (nextPath: string) => {
    setEntries(null);
    setSelected(null);
    clearTypeahead();
    setRawPath(nextPath);
  };

  // Up one level, like the nav bar's back button (disabled at the same boundary).
  const goUp = () => {
    const parent = dirname(path);
    if (parent !== "") enter(parent);
  };

  // Filter the list; a selection the new query hides is dropped so Choose never targets an
  // invisible row.
  const changeQuery = (next: string) => {
    setQuery(next);
    if (
      selected &&
      entries &&
      !filterEntries(entries, next).some((entry) => entry.path === selected)
    )
      setSelected(null);
  };

  const onNewFolder = async () => {
    if (!path) return;
    const created = await fs.createFolder(path);
    // Clear the filter so the freshly created (and selected) folder is actually listed.
    setQuery("");
    setReloadKey((key) => key + 1);
    setSelected(created);
  };

  // The row a click on a leaf should choose. In file mode only files are valid targets; in folder
  // mode the selected folder (or the folder currently open when nothing is selected) is the target.
  const selectedEntry = entries?.find((entry) => entry.path === selected);
  const target = isFileMode
    ? selectedEntry && !selectedEntry.isDir
      ? selectedEntry.path
      : null
    : (selected ?? (path || null));
  const confirm = () => {
    if (target) onChoose(target);
  };

  // Single-click highlights any row; double-click enters folders, or picks a file outright.
  const onRowActivate = (entry: PickerEntry) => {
    if (entry.isDir) enter(entry.path);
    else onChoose(entry.path);
  };

  const crumbs = crumbsFor(path);

  const rowIcon = (entry: PickerEntry) =>
    entry.isDir
      ? atRoot
        ? faHardDrive
        : faFolder
      : getFileIcon(fileTypes, entry.extension);

  // Same colour rules as the directory's entries; volumes at the root keep the default accent.
  const rowColor = (entry: PickerEntry) =>
    atRoot
      ? undefined
      : entryIconColor({
          isDir: entry.isDir,
          extension: entry.extension,
          tags: tagsByPath[entry.path] ?? NO_TAGS,
          extensions: fileTypes,
          colorfulFileTypes,
        });

  // The visible rows as a plain list for keyboard indexing (empty while loading).
  const listed = visibleEntries ?? [];
  const selectedIndex = listed.findIndex((entry) => entry.path === selected);

  const selectAt = (index: number) => {
    const entry = listed[index];
    if (entry) setSelected(entry.path);
  };

  // Type-to-find over the visible rows (prefix match; a repeated single key cycles).
  const typeaheadChar = (char: string) => {
    const typed = typeahead.push(char);
    const match = findTypeaheadMatch(
      listed,
      typed,
      typeaheadStartIndex(typed, selectedIndex),
    );
    if (match) setSelected(match.path);
  };

  // Backspace edits an active type-to-find (re-matching from the top); with no buffer it goes up
  // a level, like Finder's Cmd+Up.
  const backspace = () => {
    const typed = typeahead.backspace();
    if (typed === null) {
      goUp();
      return;
    }
    const match = findTypeaheadMatch(listed, typed, 0);
    if (match) setSelected(match.path);
  };

  // Keyboard model for the focused list. A React handler on the list itself (no document
  // listener), so it only acts while the picker owns focus and never races the directory behind.
  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const mod = event.metaKey || event.ctrlKey;

    if (mod && event.key.toLowerCase() === KEY.F) {
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }
    if (mod && event.key === KEY.ARROW_UP) {
      event.preventDefault();
      goUp();
      return;
    }

    // Printable single characters drive type-to-find.
    if (event.key.length === 1 && !mod && !event.altKey) {
      event.preventDefault();
      typeaheadChar(event.key);
      return;
    }

    if (mod || event.altKey) return;

    switch (event.key) {
      case KEY.BACKSPACE:
        event.preventDefault();
        backspace();
        break;
      case KEY.ESCAPE:
        // An active type-to-find is cleared first; only stop the event then, so a plain Escape
        // still reaches the Dialog and closes the picker.
        if (typeahead.isActive()) {
          event.preventDefault();
          event.stopPropagation();
          clearTypeahead();
        }
        break;
      case KEY.ARROW_DOWN:
        event.preventDefault();
        selectAt(
          selectedIndex < 0
            ? 0
            : Math.min(selectedIndex + 1, listed.length - 1),
        );
        break;
      case KEY.ARROW_UP:
        event.preventDefault();
        selectAt(
          selectedIndex < 0
            ? listed.length - 1
            : Math.max(selectedIndex - 1, 0),
        );
        break;
      case KEY.HOME:
        event.preventDefault();
        selectAt(0);
        break;
      case KEY.END:
        event.preventDefault();
        selectAt(listed.length - 1);
        break;
      case KEY.ENTER:
        // Enter opens a selected folder / picks a selected file; with nothing selected it confirms
        // the current target (the open folder, in folder mode).
        event.preventDefault();
        if (selectedEntry) onRowActivate(selectedEntry);
        else confirm();
        break;
    }
  };

  // Search field: Escape clears a non-empty query (stopping it so the Dialog stays open); an empty
  // field lets Escape through to close the picker. Enter/ArrowDown hand focus back to the list.
  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEY.ESCAPE && query) {
      event.preventDefault();
      event.stopPropagation();
      changeQuery("");
      return;
    }
    if (event.key === KEY.ENTER || event.key === KEY.ARROW_DOWN) {
      event.preventDefault();
      if (selectedIndex < 0) selectAt(0);
      listRef.current?.focus();
    }
  };

  const sidebarItem = (
    key: string,
    itemPath: string,
    icon: typeof faFolder,
    label: string,
  ) => (
    <button
      type="button"
      key={key}
      className={classNames(
        "folder_picker_source_item",
        path === itemPath && "active",
      )}
      onClick={() => enter(itemPath)}
    >
      <Icon icon={icon} />
      <span className="folder_picker_source_label">{label}</span>
    </button>
  );

  return (
    <Dialog
      visible={visible}
      title={config.title}
      onClose={onClose}
      className="folder_picker"
    >
      <DialogHeader
        title={config.title}
        titleId={PATH_PICKER_TITLE_ID}
        onClose={onClose}
      />

      <div className="folder_picker_body">
        <aside className="folder_picker_source">
          {favorites.length > 0 && (
            <div className="folder_picker_source_group">
              <span className="folder_picker_source_title">
                {t.folderPicker.favorites}
              </span>
              {FAVORITE_ORDER.map((key) => {
                const fav = favorites.find((f) => f.key === key);
                if (!fav) return null;
                return sidebarItem(
                  key,
                  fav.path,
                  FAVORITE_ICON[key],
                  t.folderPicker[key],
                );
              })}
            </div>
          )}
          {locations.length > 0 && (
            <div className="folder_picker_source_group">
              <span className="folder_picker_source_title">
                {t.folderPicker.locations}
              </span>
              {locations.map((loc) =>
                sidebarItem(loc.path, loc.path, faHardDrive, loc.name),
              )}
            </div>
          )}
        </aside>

        <div className="folder_picker_main">
          <div className="folder_picker_nav">
            <button
              type="button"
              className="folder_picker_up"
              onClick={() => enter(dirname(path))}
              disabled={dirname(path) === ""}
              aria-label={t.folderPicker.locations}
            >
              <Icon icon={faArrowLeft} />
            </button>
            <div className="folder_picker_crumbs">
              {crumbs.map((crumb, index) => (
                <span key={crumb.path} className="folder_picker_crumb_group">
                  {index > 0 && (
                    <Icon className="folder_picker_sep" icon={faChevronRight} />
                  )}
                  <button
                    type="button"
                    className={classNames(
                      "folder_picker_crumb",
                      crumb.path === path && "active",
                    )}
                    onClick={() => enter(crumb.path)}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
            <div className="folder_picker_search">
              <Icon
                className="folder_picker_search_icon"
                icon={faMagnifyingGlass}
              />
              <TextInput
                unstyled
                ref={searchRef}
                className="folder_picker_search_input"
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={t.folderPicker.searchPlaceholder}
                aria-label={t.folderPicker.search}
              />
            </div>
          </div>

          <div
            ref={listRef}
            className="folder_picker_list"
            role="listbox"
            tabIndex={0}
            aria-labelledby={PATH_PICKER_TITLE_ID}
            onKeyDown={onListKeyDown}
          >
            {visibleEntries === null ? (
              <p className="folder_picker_empty">{t.folderPicker.loading}</p>
            ) : visibleEntries.length === 0 ? (
              <p className="folder_picker_empty">
                {query ? t.folderPicker.noMatches : config.emptyLabel}
              </p>
            ) : (
              visibleEntries.map((entry) => {
                const isSelected = selected === entry.path;
                const color = rowColor(entry);
                return (
                  <button
                    type="button"
                    key={entry.path}
                    ref={isSelected ? selectedRowRef : undefined}
                    role="option"
                    aria-selected={isSelected}
                    // Rows are options of the focusable listbox, not separate tab stops.
                    tabIndex={-1}
                    className={classNames(
                      "folder_picker_row",
                      isSelected && "selected",
                    )}
                    onClick={() => {
                      setSelected(entry.path);
                      // Keep keyboard focus on the list so arrows/type-to-find continue.
                      listRef.current?.focus();
                    }}
                    onDoubleClick={() => onRowActivate(entry)}
                  >
                    <Icon
                      icon={rowIcon(entry)}
                      style={color ? { color } : undefined}
                    />
                    <span className="folder_picker_row_name">{entry.name}</span>
                    <TagDots tags={tagsByPath[entry.path] ?? NO_TAGS} />
                  </button>
                );
              })
            )}
          </div>

          <TypeaheadPopup query={typeaheadQuery} />
        </div>
      </div>

      <div className="folder_picker_actions">
        {!isFileMode && (
          <Button
            className="folder_picker_newfolder"
            onClick={onNewFolder}
            disabled={atRoot}
          >
            <Icon icon={faFolderPlus} />
            <span>{t.folderPicker.newFolder}</span>
          </Button>
        )}
        <DialogActions className="folder_picker_actions_right">
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button
            className="folder_picker_choose"
            onClick={confirm}
            disabled={!target}
          >
            {config.chooseLabel}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
};

export default PathPickerDialog;
