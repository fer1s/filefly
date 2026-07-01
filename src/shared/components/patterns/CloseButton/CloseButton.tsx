import { isMacPlatform, ESCAPE_HOTKEY } from "@/shared/keymap";
import IconButton from "@/shared/components/elements/IconButton";
import Icon from "@/shared/components/elements/Icon";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/CloseButton.css";

import type { CloseButtonProps } from "./types";

// Platform-aware close control. macOS: the red traffic-light dot (shows an ✕ on hover). Other
// OSes: the ✕ button in the danger colour, keeping its tooltip + Esc hint.
const CloseButton = ({ onClose }: CloseButtonProps) => {
  if (isMacPlatform())
    return (
      <button
        type="button"
        className="mac_close"
        onClick={onClose}
        aria-label={t.common.close}
      >
        <Icon icon={faXmark} className="mac_close_glyph" />
      </button>
    );

  return (
    <IconButton
      icon={faXmark}
      onClick={onClose}
      tooltip={t.common.close}
      hotkey={ESCAPE_HOTKEY}
      aria-label={t.common.close}
      className="icon_button_danger"
    />
  );
};

export default CloseButton;
