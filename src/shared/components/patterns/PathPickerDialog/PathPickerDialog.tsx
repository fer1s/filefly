import { useEffect, useState } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { useStateContext } from "@/shared/providers/StateProvider";
import { classNames, dirname } from "@/shared/utils";
import { t } from "@/lang";

import {
  faChevronRight,
  faFolder,
  faFile,
  faHardDrive,
  faArrowLeft,
  faFolderPlus,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/FolderPicker.css";

import {
  PATH_PICKER_TITLE_ID,
  FAVORITE_ORDER,
  FAVORITE_ICON,
} from "./constants";
import {
  crumbsFor,
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
  initialPath,
  onChoose,
  onClose,
}: PathPickerDialogProps) => {
  useCloseOnEscape(visible, onClose);

  const { fs } = useStateContext();
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
    }
  }

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

  // Navigate into a folder: clear the pending listing (shows loading) and the selection.
  const enter = (nextPath: string) => {
    setEntries(null);
    setSelected(null);
    setRawPath(nextPath);
  };

  const onNewFolder = async () => {
    if (!path) return;
    const created = await fs.createFolder(path);
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

  const atRoot = path === "";
  const crumbs = crumbsFor(path);

  const rowIcon = (entry: PickerEntry) =>
    entry.isDir ? (atRoot ? faHardDrive : faFolder) : faFile;

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
      onClose={onClose}
      className="folder_picker"
      labelledBy={PATH_PICKER_TITLE_ID}
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
          </div>

          <div className="folder_picker_list" role="listbox">
            {entries === null ? (
              <p className="folder_picker_empty">{t.folderPicker.loading}</p>
            ) : entries.length === 0 ? (
              <p className="folder_picker_empty">{config.emptyLabel}</p>
            ) : (
              entries.map((entry) => (
                <button
                  type="button"
                  key={entry.path}
                  role="option"
                  aria-selected={selected === entry.path}
                  className={classNames(
                    "folder_picker_row",
                    selected === entry.path && "selected",
                  )}
                  onClick={() => setSelected(entry.path)}
                  onDoubleClick={() => onRowActivate(entry)}
                >
                  <Icon icon={rowIcon(entry)} />
                  <span className="folder_picker_row_name">{entry.name}</span>
                </button>
              ))
            )}
          </div>
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
        <div className="folder_picker_actions_right">
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button
            className="folder_picker_choose"
            onClick={confirm}
            disabled={!target}
          >
            {config.chooseLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default PathPickerDialog;
