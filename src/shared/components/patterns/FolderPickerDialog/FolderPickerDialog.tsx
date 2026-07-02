import { useEffect, useState } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { classNames, dirname } from "@/shared/utils";
import { t } from "@/lang";

import {
  faChevronRight,
  faFolder,
  faHardDrive,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/FolderPicker.css";

import { FOLDER_PICKER_TITLE_ID } from "./constants";
import { crumbsFor, loadFolders, loadVolumes } from "./utils";
import type { FolderPickerDialogProps, PickerEntry } from "./types";

// The app's own folder picker: browse volumes and folders in-window and choose one, instead of the
// native Finder dialog. Backed by the same readDirectory/getVolumes IPC as the main browser.
const FolderPickerDialog = ({
  visible,
  initialPath,
  onChoose,
  onClose,
}: FolderPickerDialogProps) => {
  useCloseOnEscape(visible, onClose);

  // "" is the Locations root (a list of volumes); any other value is an absolute folder path.
  const [path, setPath] = useState("");
  // null while the current level is loading (mirrors the repo's loading-as-null convention).
  const [entries, setEntries] = useState<PickerEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Reset to the caller's starting folder each time the dialog opens. Done during render (not in an
  // effect) so the load below sees the fresh path on the first render — see React "adjusting state
  // while rendering".
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setPath(initialPath);
      setEntries(null);
      setSelected(null);
    }
  }

  // Load the current level's folders (volumes at the root; directory children otherwise). setState
  // only fires from the async callback, guarded against landing after the user navigated away.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const load = path === "" ? loadVolumes() : loadFolders(path);
    load.then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, path]);

  // Navigate into a folder/volume: clear the pending listing (shows loading) and the selection.
  const enter = (entry: PickerEntry) => {
    setEntries(null);
    setSelected(null);
    setPath(entry.path);
  };

  const goUp = () => {
    setEntries(null);
    setSelected(null);
    setPath(dirname(path));
  };

  // Choose the selected folder, or the folder currently open when nothing is selected. At the
  // Locations root there is no open folder, so a selection is required (Choose is disabled).
  const target = selected ?? (path || null);
  const confirm = () => {
    if (target) onChoose(target);
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="folder_picker"
      labelledBy={FOLDER_PICKER_TITLE_ID}
    >
      <DialogHeader
        title={t.folderPicker.title}
        titleId={FOLDER_PICKER_TITLE_ID}
        onClose={onClose}
      />

      <div className="folder_picker_nav">
        <button
          type="button"
          className="folder_picker_up"
          onClick={goUp}
          disabled={path === ""}
          aria-label={t.folderPicker.locations}
        >
          <Icon icon={faArrowLeft} />
        </button>
        <div className="folder_picker_crumbs">
          <button
            type="button"
            className={classNames("folder_picker_crumb", path === "" && "active")}
            onClick={() => enter({ name: "", path: "" })}
          >
            {t.folderPicker.locations}
          </button>
          {crumbsFor(path).map((crumb) => (
            <span key={crumb.path} className="folder_picker_crumb_group">
              <Icon className="folder_picker_sep" icon={faChevronRight} />
              <button
                type="button"
                className={classNames(
                  "folder_picker_crumb",
                  crumb.path === path && "active",
                )}
                onClick={() => enter(crumb)}
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
          <p className="folder_picker_empty">{t.folderPicker.empty}</p>
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
              onDoubleClick={() => enter(entry)}
            >
              <Icon icon={path === "" ? faHardDrive : faFolder} />
              <span className="folder_picker_row_name">{entry.name}</span>
            </button>
          ))
        )}
      </div>

      <div className="folder_picker_actions">
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button
          className="folder_picker_choose"
          onClick={confirm}
          disabled={!target}
        >
          {t.folderPicker.choose}
        </Button>
      </div>
    </Dialog>
  );
};

export default FolderPickerDialog;
