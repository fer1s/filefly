import {
  faChevronLeft,
  faChevronRight,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import IconButton, {
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { useKeymap, formatBinding, KEYMAP_ACTION } from "@/shared/keymap";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";
import type { PreviewControlsProps } from "./types";
import "@/styles/components/PreviewControls.css";

// Every preview shares navigation and Trash; media-specific controls occupy the middle slot.
const PreviewControls = ({
  onPrev,
  onNext,
  onDelete,
  hasPrev,
  hasNext,
  children,
  className,
}: PreviewControlsProps) => {
  const { keymap } = useKeymap();
  return (
    <div className={classNames("preview_controls", className)}>
      <IconButton
        icon={faChevronLeft}
        onClick={onPrev}
        disabled={!hasPrev}
        tooltip={t.common.previous}
        hotkey={formatBinding(keymap[KEYMAP_ACTION.PREVIEW_PREV])}
        aria-label={t.common.previous}
      />
      {children}
      <IconButton
        icon={faChevronRight}
        onClick={onNext}
        disabled={!hasNext}
        tooltip={t.common.next}
        hotkey={formatBinding(keymap[KEYMAP_ACTION.PREVIEW_NEXT])}
        aria-label={t.common.next}
      />
      <IconButton
        icon={faTrash}
        variant={ICON_BUTTON_VARIANT.DANGER}
        onClick={onDelete}
        tooltip={t.contextMenu.delete}
        hotkey={formatBinding(keymap[KEYMAP_ACTION.TRASH])}
        aria-label={t.contextMenu.delete}
      />
    </div>
  );
};

export default PreviewControls;
