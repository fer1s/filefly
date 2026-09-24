import {
  faBroom,
  faFolder,
  faFolderOpen,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import Button from "@/shared/components/elements/Button";
import Chip, { CHIP_VARIANT } from "@/shared/components/elements/Chip";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import Spinner from "@/shared/components/elements/Spinner";
import { CLEANUP_MODE } from "@/shared/constants";
import { classNames, formatBytes } from "@/shared/utils";
import { t } from "@/lang";

import type { CleanupChipProps } from "./types";

// The last path segment, for the chip label; the full path stays available as the tooltip and by
// clicking the label. Falls back to the whole path for a root-ish value with no segments.
const baseName = (path: string): string =>
  path.split("/").filter(Boolean).pop() ?? path;

// One watched folder as a compact pill, matching the size-ignore pattern chips: `name size` plus
// inline actions — a mode toggle (empty contents vs delete the folder), a broom to clean, and × to
// stop watching. Presentational; every action is handed up to useCleanupTargets.
//
// The label is the folder's basename (the full path is the tooltip; clicking the label opens the
// folder in a new window). While this chip's own cleanup runs, the broom is replaced by a spinner.
// A missing folder (`exists: false`) keeps its chip but loses size, mode and broom: there is
// nothing to reclaim, and dropping it automatically would hide that the path went away.
const CleanupChip = ({
  target,
  busy,
  locked,
  onOpen,
  onModeToggle,
  onClean,
  onRemove,
}: CleanupChipProps) => {
  const contents = target.mode === CLEANUP_MODE.CONTENTS;
  const modeLabel = contents
    ? t.settings.cleanupModeContents
    : t.settings.cleanupModeFolder;

  return (
    <Chip
      variant={CHIP_VARIANT.OUTLINE}
      className={classNames(
        "Chip--deletable",
        "settings_cleanup_chip",
        !target.exists && "settings_cleanup_chip--missing",
      )}
    >
      <Button
        unstyled
        className="Chip_label settings_cleanup_chip_name"
        title={target.path}
        onClick={() => onOpen(target.path)}
      >
        {baseName(target.path)}
      </Button>
      <span className="settings_cleanup_chip_size">
        {target.exists ? formatBytes(target.size) : t.settings.cleanupMissing}
      </span>
      {target.exists && (
        <IconButton
          icon={contents ? faFolderOpen : faFolder}
          size={ICON_BUTTON_SIZE.SM}
          variant={ICON_BUTTON_VARIANT.GHOST}
          disabled={locked}
          tooltip={t.settings.cleanupModeToggle(modeLabel)}
          aria-label={t.settings.cleanupModeToggle(modeLabel)}
          onClick={onModeToggle}
        />
      )}
      {target.exists &&
        (busy ? (
          <Spinner />
        ) : (
          <IconButton
            icon={faBroom}
            size={ICON_BUTTON_SIZE.SM}
            variant={ICON_BUTTON_VARIANT.GHOST}
            disabled={locked}
            tooltip={t.settings.cleanupClean}
            aria-label={t.settings.cleanupClean}
            onClick={onClean}
          />
        ))}
      <IconButton
        icon={faXmark}
        size={ICON_BUTTON_SIZE.SM}
        variant={ICON_BUTTON_VARIANT.DANGER}
        disabled={locked}
        tooltip={t.settings.cleanupRemove}
        aria-label={t.settings.cleanupRemove}
        onClick={onRemove}
      />
    </Chip>
  );
};

export default CleanupChip;
