import { classNames } from "@/shared/utils";

import "@/styles/components/DetailsPopup.css";

import type { DetailsPopupProps } from "./types";

const DetailsPopup = ({ visible, title, children }: DetailsPopupProps) => (
  <div className={classNames("details_popup", "shadow", visible && "visible")}>
    <div className="title">{title}</div>
    <div className="content">{children}</div>
  </div>
);

export default DetailsPopup;
