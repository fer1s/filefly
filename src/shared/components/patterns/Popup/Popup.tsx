import { classNames } from "@/shared/utils";

import "@/styles/components/Popup.css";

import type { PopupProps } from "./types";

const Popup = ({ visible, title, children }: PopupProps) => (
  <div className={classNames("popup", "shadow", visible && "visible")}>
    <div className="title">{title}</div>
    <div className="content">{children}</div>
  </div>
);

export default Popup;
