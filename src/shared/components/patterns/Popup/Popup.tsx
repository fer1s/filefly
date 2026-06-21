import { classNames } from "@/shared/utils";

import "@/styles/components/Popup.css";

import type { PopupProps } from "./types";

const Popup = ({
  visible,
  title,
  children,
  className,
  interactive = true,
}: PopupProps) => (
  <div
    className={classNames(
      "popup",
      "shadow",
      className,
      visible && "visible",
      !interactive && "non_interactive",
    )}
  >
    {title && <div className="title">{title}</div>}
    <div className="content">{children}</div>
  </div>
);

export default Popup;
