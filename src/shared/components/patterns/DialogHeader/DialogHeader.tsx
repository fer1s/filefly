import { classNames } from "@/shared/utils";
import { isMacPlatform } from "@/shared/keymap";
import CloseButton from "@/shared/components/patterns/CloseButton";
import { useDialogDrag } from "@/shared/components/patterns/Dialog/dragContext";

import "@/styles/components/DialogHeader.css";

import type { DialogHeaderProps } from "./types";

// Header for modal dialogs: a title plus a close control. On macOS the close is the red
// traffic-light dot on the left and the title is centred (macOS app style); elsewhere it's the
// ✕ button in the danger colour on the right with the title left-aligned.
const DialogHeader = ({ title, titleId, onClose }: DialogHeaderProps) => {
  const mac = isMacPlatform();
  // Inside a draggable Dialog this binds the header as the move handle (null otherwise).
  const dragBind = useDialogDrag();

  return (
    <div
      className={classNames("panel_header", mac && "mac", dragBind && "draggable")}
      {...(dragBind ? dragBind() : {})}
    >
      {mac && <CloseButton onClose={onClose} />}
      <h4 id={titleId}>{title}</h4>
      {!mac && <CloseButton onClose={onClose} />}
    </div>
  );
};

export default DialogHeader;
